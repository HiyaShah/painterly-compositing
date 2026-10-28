import * as THREE from './vendor/three.module.js';
import {random} from './core.js';

export function makeBrushes(){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const ctx=canvas.getContext('2d');
 for(let style=0;style<3;style++){
   const rng=random(113+style);ctx.save();ctx.translate(style*256,0);
   for(let i=0;i<170;i++){
     const y=55+rng()*146,dy=(y-128)/78,width=Math.sqrt(Math.max(0,1-dy*dy));
     const left=128-width*(85+rng()*22),right=128+width*(80+rng()*26);
     ctx.strokeStyle=`rgba(255,255,255,${style===1?.12+rng()*.17:.14+rng()*.45})`;
     ctx.lineWidth=style===1?4+rng()*9:style===2?1+rng()*2:2+rng()*4;
     ctx.lineCap=style===1?'round':'butt';ctx.beginPath();ctx.moveTo(left+(style===0?rng()*19:0),y);ctx.bezierCurveTo(100,y-4,160,y+3,right,y+rng()*4-2);ctx.stroke();
   }
   // Tiny unpainted gaps give the dry brush a visible bristle texture.
   if(style!==1){ctx.globalCompositeOperation='destination-out';for(let i=0;i<25;i++){ctx.fillStyle=`rgba(0,0,0,${rng()*.5})`;ctx.fillRect(30+rng()*150,50+rng()*155,20+rng()*55,.5+rng()*1.4);}}
   ctx.restore();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
 return{canvas,texture};
}

export function makeCards(sample,texture){
 const geometry=new THREE.InstancedBufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
 const attributes={anchor:new THREE.InstancedBufferAttribute(sample.positions,3),paintColor:new THREE.InstancedBufferAttribute(sample.colors,3),variation:new THREE.InstancedBufferAttribute(sample.variations,4)};
 for(const [name,a] of Object.entries(attributes)){a.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(name,a);}
 const material=new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
   uniforms:{brushMap:{value:texture},size:{value:.24},opacity:{value:.85},rotation:{value:Math.PI/4},depthCompensation:{value:.25},brush:{value:0},points:{value:0},haze:{value:1},fogColor:{value:new THREE.Color('#d9e0d4')}},
   vertexShader:`
   attribute vec3 anchor; attribute vec3 paintColor; attribute vec4 variation;
   uniform float size; uniform float rotation; uniform float depthCompensation; uniform float points;
   varying vec2 vUv; varying vec3 vColor; varying float vDepth; varying float vSeed;
   void main(){
     vUv=uv;vColor=paintColor;vSeed=variation.w;
     vec4 p=modelViewMatrix*vec4(anchor,1.0);vDepth=-p.z;
     float a=(variation.x-.5)*rotation*2.0;
     mat2 r=mat2(cos(a),-sin(a),sin(a),cos(a));
     float scale=mix(size*(.65+variation.y*.7),.035,points);
     scale*=mix(1.0,clamp(-p.z/12.0,.15,3.0),depthCompensation);
     vec2 offset=r*(position.xy*vec2(1.65,1.0))*scale;
     p.xy+=offset;p.z+=.012;
     gl_Position=projectionMatrix*p;
   }`,
   fragmentShader:`
   uniform sampler2D brushMap; uniform float opacity; uniform float brush; uniform float points; uniform float haze; uniform vec3 fogColor;
   varying vec2 vUv; varying vec3 vColor; varying float vDepth; varying float vSeed;
   void main(){
     float alpha=texture2D(brushMap,vec2((vUv.x+brush)/3.0,vUv.y)).a;
     if(points>.5)alpha=1.0-smoothstep(.35,.49,length(vUv-.5));
     alpha*=mix(opacity,1.0,points);
     if(alpha<.035)discard;
     vec3 col=vColor*(.95+.1*vSeed);
     float fogFactor=1.0-exp(-.035*.035*vDepth*vDepth);
     col=mix(col,fogColor,fogFactor*haze);
     if(points>.5)col=mix(col,vec3(.40,.26,.55),.35);
     gl_FragColor=vec4(col,alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
   }`
 });
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=10;
 return{mesh,geometry,material,update(data,count){for(const [name,key] of [['anchor','positions'],['paintColor','colors'],['variation','variations']]){geometry.attributes[name].array.set(data[key]);geometry.attributes[name].needsUpdate=true;}geometry.instanceCount=Math.min(count,data.count);}};
}
