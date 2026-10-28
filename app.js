import * as THREE from './vendor/three.module.js';
import {sampleSurface,distribution,cameraPath,selectSamples,clamp} from './core.js';
import {buildForest} from './scene.js';
import {makeBrushes,makeCards} from './brushes.js';

const $=id=>document.getElementById(id),viewport=$('viewport');
const state={mode:'stable',coverage:'path',brush:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,time:.16,direction:1,speed:1,frame:0};
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
catch(e){$('loading').hidden=true;$('error').hidden=false;$('error').textContent='The forest needs WebGL. Please enable hardware acceleration or try another browser. The controls below explain what each view demonstrates.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.autoClear=false;viewport.appendChild(renderer.domElement);
const {scene,surfaces}=buildForest(),originalFog=scene.fog;
const camera=new THREE.PerspectiveCamera(35,1,.1,85),testCamera=new THREE.PerspectiveCamera(35,1,.1,85),projector=new THREE.Matrix4(),point=new THREE.Vector3();
const dist=distribution(surfaces),samples=[];for(let i=0;i<8;i++)samples.push(sampleSurface(surfaces,18000,120+i*71,dist));
const brushes=makeBrushes(),cards=makeCards(samples[0],brushes.texture);scene.add(cards.mesh);
document.querySelectorAll('[data-brush] canvas').forEach((c,i)=>{const ctx=c.getContext('2d');ctx.drawImage(brushes.canvas,i*256,0,256,256,4,-3,92,66);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#8d7cab';ctx.fillRect(0,0,100,60);});
const cache=new Map();let currentKey='',width=1,height=1;
function applyCamera(cam,t){const p=cameraPath(t);cam.position.set(...p.position);cam.lookAt(new THREE.Vector3(...p.target));cam.updateMatrixWorld();}
function makeFrustum(t){testCamera.aspect=camera.aspect;testCamera.updateProjectionMatrix();applyCamera(testCamera,t);projector.multiplyMatrices(testCamera.projectionMatrix,testCamera.matrixWorldInverse);return new THREE.Frustum().setFromProjectionMatrix(projector);}
function covered(index){
 const key=state.coverage+':'+index;if(cache.has(key))return cache.get(key);
 const frusta=state.coverage==='single'?[makeFrustum(0)]:Array.from({length:7},(_,i)=>makeFrustum(i/6)),s=samples[index],indices=[];
 for(let i=0;i<s.count;i++){point.fromArray(s.positions,i*3);if(frusta.some(f=>f.containsPoint(point)))indices.push(i);}
 const subset=selectSamples(s,indices);cache.set(key,subset);return subset;
}
function setCards(unstable){
 const index=unstable?state.frame%8:0,key=state.coverage+':'+index;
 const data=covered(index);if(currentKey!==key){cards.update(data,+$('density').value);currentKey=key;}else cards.geometry.instanceCount=Math.min(data.count,+$('density').value);
 return cards.geometry.instanceCount;
}
function resize(){width=viewport.clientWidth;height=viewport.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();cache.clear();currentKey='';}
new ResizeObserver(resize).observe(viewport);resize();applyCamera(camera,state.time);
function selected(selector,key,value){document.querySelectorAll(selector).forEach(b=>{const active=b.dataset[key]===value;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});}
const descriptions={original:'The lit scene, before brushstrokes are composited.',unstable:'New surface samples every frame. Notice the shimmer.',stable:'Same points. Same brushstrokes. Moving camera.',compare:'Left: resampled strokes. Right: persistent 3D anchors.'};
function syncMode(){
 selected('[data-mode]','mode',state.mode);$('status').textContent=descriptions[state.mode];
 $('mode-badge').textContent={original:'BAKED SURFACE LIGHTING',unstable:'RESAMPLED AT 12 HZ',stable:'STABLE 3D ANCHORS',compare:'TEMPORAL COHERENCE STUDY'}[state.mode];
 for(const id of ['comparison-labels','wipe-line','wipe-control'])$(id).hidden=state.mode!=='compare';
 $('mode-badge').hidden=state.mode==='compare';
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;syncMode();});
document.querySelectorAll('[data-coverage]').forEach(b=>b.onclick=()=>{
 state.coverage=b.dataset.coverage;selected('[data-coverage]','coverage',state.coverage);currentKey='';
 $('coverage-note').textContent=state.coverage==='single'?'Only points inside the starting camera frustum. Move along the path to reveal missing paint coverage.':'Merge points across 7 camera positions to cover the moving shot.';
});
document.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>{state.brush=+b.dataset.brush;selected('[data-brush]','brush',String(state.brush));cards.material.uniforms.brush.value=state.brush;});
const controls={size:v=>v.toFixed(2),density:v=>v.toLocaleString(),mix:v=>Math.round(v*100)+'%',rotation:v=>Math.round(v)+'°',depth:v=>Math.round(v*100)+'%'};
function syncControls(){
 for(const [id,format] of Object.entries(controls))$(id+'-value').value=format(+$(id).value);
 const u=cards.material.uniforms;u.size.value=+$('size').value;u.opacity.value=+$('mix').value;u.rotation.value=+$('rotation').value*Math.PI/180;u.depthCompensation.value=+$('depth').value;u.points.value=$('points').checked?1:0;
 u.haze.value=$('fog').checked?1:0;scene.fog=$('fog').checked?originalFog:null;
 $('wipe-line').style.left=$('wipe').value+'%';
}
for(const id of [...Object.keys(controls),'points','fog','wipe'])$(id).oninput=syncControls;
function syncPlay(){$('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'Pause camera':'Play camera');}
$('play').onclick=()=>{state.playing=!state.playing;syncPlay();};
$('time').oninput=()=>{state.time=+$('time').value;state.playing=false;syncPlay();};
$('speed').onclick=()=>{state.speed=state.speed===1?.5:state.speed===.5?2:1;$('speed').textContent=state.speed+'×';};
$('camera-reset').onclick=()=>{state.time=.16;state.direction=1;};
$('reset').onclick=()=>{
 for(const [id,value] of Object.entries({size:.24,density:12000,mix:.85,rotation:45,depth:.25,wipe:50}))$(id).value=value;
 $('points').checked=false;$('fog').checked=true;state.time=.16;state.direction=1;state.speed=1;state.brush=0;state.coverage='path';state.mode='stable';state.playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 $('speed').textContent='1×';document.querySelector('[data-coverage="path"]').click();document.querySelector('[data-brush="0"]').click();syncControls();syncMode();syncPlay();
};
function renderView(unstable,paint=true){cards.mesh.visible=paint;if(paint)setCards(unstable);renderer.clear();renderer.render(scene,camera);}
let last=performance.now(),report=last,frames=0,flickerClock=0;
function animate(now){
 requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.06);last=now;
 if(document.hidden)return;
 if(state.playing){state.time+=dt/16*state.speed*state.direction;if(state.time>1){state.time=2-state.time;state.direction=-1;}if(state.time<0){state.time=-state.time;state.direction=1;}}
 // Pause freezes both camera and resampling for frame inspection.
 if(state.playing){flickerClock+=dt;state.frame=Math.floor(flickerClock*12);}
 applyCamera(camera,state.time);$('time').value=state.time;$('time-value').textContent=(state.time*16).toFixed(1).padStart(4,'0')+' / 16.0 s';
 if(state.mode==='compare'){
   const split=Math.round(width*+$('wipe').value/100);renderer.setScissorTest(true);renderer.setScissor(0,0,split,height);renderView(true);renderer.setScissor(split,0,width-split,height);renderView(false);renderer.setScissorTest(false);
 }else renderView(state.mode==='unstable',state.mode!=='original');
 frames++;if(now-report>500){$('fps').textContent=Math.round(frames*1000/(now-report));$('count').textContent=(state.mode==='original'?0:cards.geometry.instanceCount).toLocaleString();report=now;frames=0;}
}
syncControls();syncMode();syncPlay();$('loading').hidden=true;requestAnimationFrame(animate);
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();$('error').hidden=false;$('error').textContent='The graphics context was lost. Reload the page to reopen the grove.';});
