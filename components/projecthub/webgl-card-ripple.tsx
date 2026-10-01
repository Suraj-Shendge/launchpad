"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef, type RefObject } from "react";
import html2canvas from "html2canvas-pro";

export type WebGLRippleApi = {
  start: () => void;
  move: (x: number, y: number) => void;
  stop: () => void;
};

type Ripple = { x: number; y: number; born: number; strength: number };

type Props = {
  targetRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  onReady?: (ready: boolean) => void;
};

const vertex = `attribute vec2 aPosition;
varying vec2 vUv;
void main(){
  vUv = aPosition * .5 + .5;
  gl_Position = vec4(aPosition,0.0,1.0);
}`;

const fragment = `precision highp float;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uCenters[8];
uniform float uAges[8];
uniform float uStrengths[8];
varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  vec2 aspect=vec2(uResolution.x/uResolution.y,1.0);
  vec2 displacement=vec2(0.0);
  float rippleLight=0.0;
  for(int i=0;i<8;i++){
    float age=uAges[i];
    if(age<0.0) continue;
    vec2 d=(uv-uCenters[i])*aspect;
    float dist=length(d);
    float envelope=exp(-dist*6.2)*exp(-age*.95);
    float wave=sin(dist*52.0-age*15.0)*envelope;
    float front=exp(-pow((dist-age*0.25)*24.0,2.0));
    float strength=uStrengths[i]*exp(-age*.95);
    float amount=(wave*.55+front*.95)*strength;
    rippleLight += front*strength*.72;
    if(dist>.006) displacement += normalize(d)*amount*0.038;
  }
  float shimmer=sin((uv.x+uv.y)*18.0-uTime*1.7)*.0008;
  vec2 sampleUv=clamp(uv+displacement+vec2(shimmer),vec2(.002),vec2(.998));
  vec4 color=texture2D(uTexture,sampleUv);
  // A restrained specular crest makes the propagating wave readable while
  // the displacement continues to deform the actual logo/text pixels.
  color.rgb=mix(color.rgb,vec3(1.0),clamp(rippleLight*.10,0.0,.10));
  float edge=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));
  float edgeFade=smoothstep(0.0,.035,edge);
  gl_FragColor=vec4(color.rgb,color.a*edgeFade);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string){
  const shader=gl.createShader(type);
  if(!shader) throw new Error("WebGL shader allocation failed");
  gl.shaderSource(shader,source); gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const log=gl.getShaderInfoLog(shader)||"Unknown shader error"; gl.deleteShader(shader); throw new Error(log);
  }
  return shader;
}

function program(gl: WebGLRenderingContext){
  const vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);
  const p=gl.createProgram(); if(!p) throw new Error("WebGL program allocation failed");
  gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||"WebGL link failed");
  return p;
}
export const WebGLCardRipple=forwardRef<WebGLRippleApi,Props>(function WebGLCardRipple({targetRef,contentRef,onReady},ref){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const glRef=useRef<WebGLRenderingContext|null>(null);
  const textureRef=useRef<WebGLTexture|null>(null);
  const programRef=useRef<WebGLProgram|null>(null);
  const ripplesRef=useRef<Ripple[]>([]);
  const frameRef=useRef<number|null>(null);
  const startRef=useRef(0);
  const activeRef=useRef(false);
  const readyRef=useRef(false);
  const sizeRef=useRef({width:1,height:1});

  const hideDom=()=>contentRef.current?.classList.add("project-card-content-webgl-hidden");
  const showDom=()=>contentRef.current?.classList.remove("project-card-content-webgl-hidden");

  const setup=()=>{
    const canvas=canvasRef.current;if(!canvas)return null;
    const gl=canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:true});
    if(!gl)return null;
    try{
      const p=program(gl); programRef.current=p; glRef.current=gl;
      const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(p,"aPosition"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture(); textureRef.current=texture;
      gl.bindTexture(gl.TEXTURE_2D,texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      return gl;
    }catch(error){ console.warn("[ProjectHub] WebGL ripple setup failed",error); return null; }
  };

  const capture=async()=>{
    const target=targetRef.current,canvas=canvasRef.current,content=contentRef.current;if(!target||!canvas)return false;
    const wasHidden=content?.classList.contains("project-card-content-webgl-hidden")??false;
    const previousVisibility=canvas.style.visibility;
    content?.classList.remove("project-card-content-webgl-hidden");
    // Capture the content at its native size, then place it at its exact offset
    // inside a full-card texture. The GPU therefore preserves the original layout.
    canvas.style.visibility="hidden";
    try{
      await document.fonts?.ready;
      const scale=Math.min(2,window.devicePixelRatio||1); const shot=await html2canvas(content!,{backgroundColor:null,scale,useCORS:true,logging:false});
      const gl=glRef.current||setup();if(!gl||!textureRef.current)return false;
      const rect=target.getBoundingClientRect();
      sizeRef.current={width:Math.max(1,rect.width),height:Math.max(1,rect.height)};
      const contentRect=content!.getBoundingClientRect();
      const textureCanvas=document.createElement("canvas");
      textureCanvas.width=Math.max(1,Math.round(rect.width*scale));
      textureCanvas.height=Math.max(1,Math.round(rect.height*scale));
      const textureContext=textureCanvas.getContext("2d");
      if(!textureContext)return false;
      textureContext.fillStyle=getComputedStyle(target).backgroundColor;
      textureContext.fillRect(0,0,textureCanvas.width,textureCanvas.height);
      textureContext.drawImage(shot,(contentRect.left-rect.left)*scale,(contentRect.top-rect.top)*scale,shot.width,shot.height);
      canvas.width=textureCanvas.width;canvas.height=textureCanvas.height;
      canvas.style.width=rect.width+"px";canvas.style.height=rect.height+"px";
      gl.viewport(0,0,textureCanvas.width,textureCanvas.height); gl.useProgram(programRef.current);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textureRef.current);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureCanvas);
      gl.uniform1i(gl.getUniformLocation(programRef.current!,"uTexture"),0);
      gl.uniform2f(gl.getUniformLocation(programRef.current!,"uResolution"),rect.width,rect.height);
      readyRef.current=true;onReady?.(true);return true;
    }catch(error){console.warn("[ProjectHub] WebGL ripple capture failed",error);return false;
    }finally{
      canvas.style.visibility=previousVisibility;
      if(wasHidden)content?.classList.add("project-card-content-webgl-hidden");
    }
  };

  const draw=(now:number)=>{
    const gl=glRef.current,p=programRef.current;if(!gl||!p||!readyRef.current)return;
    if(!activeRef.current&&ripplesRef.current.length===0){frameRef.current=null;showDom();onReady?.(false);return;}
    const elapsed=(now-startRef.current)/1000;
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(p);
    const centers:number[]=[];const ages:number[]=[];const strengths:number[]=[];
    for(let i=0;i<8;i++){
      const r=ripplesRef.current[i];
      if(!r){centers.push(0,0);ages.push(-1);strengths.push(0);continue;}
      const age=(now-r.born)/1000;centers.push(r.x/sizeRef.current.width,1-r.y/sizeRef.current.height);ages.push(age);strengths.push(r.strength);
    }
    gl.uniform1f(gl.getUniformLocation(p,"uTime"),elapsed);
    gl.uniform2fv(gl.getUniformLocation(p,"uCenters"),new Float32Array(centers));
    gl.uniform1fv(gl.getUniformLocation(p,"uAges"),new Float32Array(ages));
    gl.uniform1fv(gl.getUniformLocation(p,"uStrengths"),new Float32Array(strengths));
    gl.drawArrays(gl.TRIANGLES,0,6);
    ripplesRef.current=ripplesRef.current.filter(r=>r.strength*Math.exp(-((now-r.born)/1000)*.95)>0.004);
    if(activeRef.current||ripplesRef.current.length)frameRef.current=requestAnimationFrame(draw);else{frameRef.current=null;showDom();onReady?.(false);}
  };

  const start=async()=>{
    activeRef.current=true;
    if(!readyRef.current){
      const ok=await capture();
      if(!ok){activeRef.current=false;return;}
    }
    hideDom();
    if(frameRef.current===null){startRef.current=performance.now();frameRef.current=requestAnimationFrame(draw);}
  };

  const stop=()=>{
    activeRef.current=false;
    if(ripplesRef.current.length===0){showDom();onReady?.(false);}
    if(frameRef.current===null)frameRef.current=requestAnimationFrame(draw);
  };

  useImperativeHandle(ref,()=>({
    start,
    move:(x,y)=>{
      if(!readyRef.current){void start();return;}
      hideDom();activeRef.current=true;
      ripplesRef.current.unshift({x,y,born:performance.now(),strength:.68});
      ripplesRef.current=ripplesRef.current.slice(0,8);
      if(frameRef.current===null){startRef.current=performance.now();frameRef.current=requestAnimationFrame(draw);}
    },
    stop,
  }),[]);

  useEffect(()=>{
    setup();
    const resize=new ResizeObserver(()=>{if(readyRef.current)void capture();});
    if(targetRef.current)resize.observe(targetRef.current);
    // Warm the texture before the first hover so the first pointer event can ripple immediately.
    const warmup=window.setTimeout(()=>{void capture();},180);
    return()=>{window.clearTimeout(warmup);resize.disconnect();showDom();if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);if(glRef.current&&textureRef.current)glRef.current.deleteTexture(textureRef.current);};
  },[]);

  return <canvas ref={canvasRef} data-webgl-ripple aria-hidden className="project-card-webgl-ripple"/>;
});
