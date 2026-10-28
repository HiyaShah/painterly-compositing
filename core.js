// Pure deterministic sampling utilities shared with the numerical tests.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function triangleArea(a,b,c){const x=b.map((v,i)=>v-a[i]),y=c.map((v,i)=>v-a[i]);return Math.hypot(x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0])*.5;}
export function distribution(triangles){let total=0;const cdf=triangles.map(t=>total+=triangleArea(...t.p)*t.weight);return{cdf,total};}
export function sampleSurface(triangles,count,seed=1,dist=distribution(triangles)){
 if(!triangles.length||!(dist.total>0))throw Error('Surface requires nondegenerate triangles');
 const rng=random(seed),positions=new Float32Array(count*3),colors=new Float32Array(count*3),variations=new Float32Array(count*4);
 for(let i=0;i<count;i++){
   const x=rng()*dist.total;let lo=0,hi=dist.cdf.length-1;while(lo<hi){const m=(lo+hi)>>>1;if(x<dist.cdf[m])hi=m;else lo=m+1;}
   const t=triangles[lo],root=Math.sqrt(rng()),b=[1-root,root*(1-rng()),0];b[2]=1-b[0]-b[1];
   for(let k=0;k<3;k++){positions[i*3+k]=t.p.reduce((s,p,j)=>s+p[k]*b[j],0)+t.n[k]*.018;colors[i*3+k]=t.c.reduce((s,c,j)=>s+c[k]*b[j],0);}
   variations.set([rng(),rng(),rng(),rng()],i*4);
 }
 return{positions,colors,variations,count};
}
export function cameraPath(t){const x=-6+12*t;return{position:[x,3.1+Math.sin(t*Math.PI)*.35,10.0],target:[x*.18,2.1,-3.8]};}
export function selectSamples(sample,indices){const out={count:indices.length,positions:new Float32Array(indices.length*3),colors:new Float32Array(indices.length*3),variations:new Float32Array(indices.length*4)};indices.forEach((k,i)=>{out.positions.set(sample.positions.subarray(k*3,k*3+3),i*3);out.colors.set(sample.colors.subarray(k*3,k*3+3),i*3);out.variations.set(sample.variations.subarray(k*4,k*4+4),i*4);});return out;}
