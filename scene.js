import * as THREE from './vendor/three.module.js';
import {random} from './core.js';

export function buildForest(){
 const scene=new THREE.Scene(),surfaces=[],rng=random(314159);
 scene.background=new THREE.Color('#d9e0d4');scene.fog=new THREE.FogExp2('#d9e0d4',.035);
 const light=new THREE.Vector3(-.5,.85,.4).normalize();
 function add(geometry,position,scale,color,weight=1,rotation=0){
   geometry=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.rotateY(rotation);geometry.scale(...scale);geometry.translate(...position);geometry.computeVertexNormals();
   const pos=geometry.attributes.position,normals=geometry.attributes.normal,base=new THREE.Color(color),colors=new Float32Array(pos.count*3);
   for(let i=0;i<pos.count;i++){
     const n=new THREE.Vector3().fromBufferAttribute(normals,i),sun=Math.max(0,n.dot(light));
     const warm=.66+.40*sun,variation=.96+.04*Math.sin(pos.getX(i)*2+pos.getZ(i));
     colors[i*3]=base.r*warm*variation;colors[i*3+1]=base.g*(.69+.33*sun)*variation;colors[i*3+2]=base.b*(.79+.23*sun)*variation;
   }
   geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}));scene.add(mesh);
   for(let i=0;i<pos.count;i+=3){const p=[],c=[];for(let j=0;j<3;j++){p.push([pos.getX(i+j),pos.getY(i+j),pos.getZ(i+j)]);c.push(Array.from(colors.subarray((i+j)*3,(i+j)*3+3)));}const a=new THREE.Vector3(...p[0]),b=new THREE.Vector3(...p[1]),d=new THREE.Vector3(...p[2]);const n=b.sub(a).cross(d.sub(a)).normalize().toArray();surfaces.push({p,c,n,weight});}
 }
 function height(x,z){return -.19+.15*Math.sin(x*.48)+.15*Math.cos(z*.43)+.12*Math.sin(x*.2+z*.35);}
 const ground=new THREE.PlaneGeometry(34,35,42,42);ground.rotateX(-Math.PI/2);const a=ground.attributes.position;
 for(let i=0;i<a.count;i++)a.setY(i,height(a.getX(i),a.getZ(i)-7));ground.computeVertexNormals();add(ground,[0,0,-7],[1,1,1],'#a8b587',1.5);
 // A meandering blush-gold clearing, laid just above the terrain.
 const path=[];for(let j=0;j<70;j++){
   const z0=6-j*.45,z1=z0-.45,c0=Math.sin(z0*.24)*1.6,c1=Math.sin(z1*.24)*1.6,w=1.12;
   const p=[[c0-w,height(c0-w,z0)+.025,z0],[c0+w,height(c0+w,z0)+.025,z0],[c1-w,height(c1-w,z1)+.025,z1],[c1+w,height(c1+w,z1)+.025,z1]];
   path.push(...p[0],...p[1],...p[2],...p[1],...p[3],...p[2]);
 }
 const pathGeo=new THREE.BufferGeometry();pathGeo.setAttribute('position',new THREE.Float32BufferAttribute(path,3));add(pathGeo,[0,0,0],[1,1,1],'#d3bb9c',1.6);
 const leafColors=['#b1bf92','#c8c390','#d5b595','#b4bca2','#b9adaf','#c1cba4'];
 const tree=(x,z,h,r)=>{
   const y=height(x,z);add(new THREE.CylinderGeometry(r*.57,r,h,7,1),[x,y+h/2,z],[1,1,1],'#8b817a',2,rng()*6);
   for(let i=0;i<4;i++){
     const angle=rng()*Math.PI*2,dx=Math.cos(angle)*(.45+rng()*.55),dz=Math.sin(angle)*(.4+rng()*.55);
     add(new THREE.IcosahedronGeometry(1,1),[x+dx,y+h-.35+rng()*.65,z+dz],[1.0+rng()*.6,.7+rng()*.5,.9+rng()*.6],leafColors[Math.floor(rng()*leafColors.length)],1.1,rng()*6);
   }
 };
 // Foreground silhouettes frame a brighter central path.
 [[-4.7,1,7,.30],[5.0,-.2,7.5,.36],[-3.8,-4,6.4,.27],[4.4,-6,6.8,.31],[-7,-8,8,.35],[8,-10,7,.3]].forEach(p=>tree(...p));
 for(let i=0;i<38;i++){const x=(rng()-.5)*29,z=-3-rng()*21;if(Math.abs(x-Math.sin(z*.24)*1.6)<2.4)continue;tree(x,z,4.4+rng()*3,.12+rng()*.15);}
 for(let i=0;i<95;i++){
   const x=(rng()-.5)*29,z=5-rng()*29;if(Math.abs(x-Math.sin(z*.24)*1.6)<1.8)continue;
   const y=height(x,z),s=.25+rng()*.6;
   add(new THREE.IcosahedronGeometry(1,0),[x,y+s*.26,z],[s,s*.5,s*.7],i%4===0?'#c4b5b7':leafColors[i%leafColors.length],1.5,rng()*6);
 }
 // Small pastel flowers provide readable fine detail for the brush controls.
 for(let i=0;i<65;i++){
   const z=3-rng()*17,side=rng()<.5?-1:1,x=Math.sin(z*.24)*1.6+side*(1.5+rng()*1.8),y=height(x,z);
   add(new THREE.IcosahedronGeometry(1,0),[x,y+.18,z],[.09,.18,.09],['#f0c8bf','#ddd0e5','#efe0b2'][i%3],3);
 }
 // All transforms are baked, so the static environment can share one draw call.
 const meshes=scene.children.slice(),vertexCount=meshes.reduce((n,m)=>n+m.geometry.attributes.position.count,0);
 const combined=new THREE.BufferGeometry(),p=new Float32Array(vertexCount*3),c=new Float32Array(vertexCount*3);let offset=0;
 for(const mesh of meshes){p.set(mesh.geometry.attributes.position.array,offset);c.set(mesh.geometry.attributes.color.array,offset);offset+=mesh.geometry.attributes.position.array.length;scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
 combined.setAttribute('position',new THREE.BufferAttribute(p,3));combined.setAttribute('color',new THREE.BufferAttribute(c,3));scene.add(new THREE.Mesh(combined,new THREE.MeshBasicMaterial({vertexColors:true})));
 return{scene,surfaces};
}
