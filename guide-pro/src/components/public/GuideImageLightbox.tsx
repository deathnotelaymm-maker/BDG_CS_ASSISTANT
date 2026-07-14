import { useEffect, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

export function openGuideImage(src:string, alt="Guide image") {
  window.dispatchEvent(new CustomEvent("bdg:preview-image", { detail:{ src, alt } }));
}

export function GuideImageLightbox() {
  const [image,setImage]=useState<{src:string;alt:string}|null>(null);
  const [scale,setScale]=useState(1);
  useEffect(()=>{
    const open=(event:Event)=>{ const detail=(event as CustomEvent).detail; if(detail?.src){setScale(1);setImage(detail);} };
    window.addEventListener("bdg:preview-image",open);
    return ()=>window.removeEventListener("bdg:preview-image",open);
  },[]);
  useEffect(()=>{ if(!image)return; const old=document.body.style.overflow; document.body.style.overflow="hidden"; const key=(e:KeyboardEvent)=>e.key==="Escape"&&setImage(null); window.addEventListener("keydown",key); return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",key);}; },[image]);
  if(!image)return null;
  const adjust=(next:number)=>setScale(Math.max(.5,Math.min(4,next)));
  return <div role="dialog" aria-modal="true" aria-label="Guide image preview" className="fixed inset-0 z-[100] flex flex-col bg-black/95" onClick={()=>setImage(null)}>
    <div className="flex items-center justify-between border-b border-white/15 p-3 text-white" onClick={e=>e.stopPropagation()}><span className="truncate text-xs text-white/70">Tap + or use two fingers to enlarge</span><div className="flex gap-2"><button aria-label="Zoom out" className="rounded-lg bg-white/10 p-2" onClick={()=>adjust(scale-.25)}><Minus className="h-5 w-5"/></button><button aria-label="Reset zoom" className="rounded-lg bg-white/10 p-2" onClick={()=>setScale(1)}><RotateCcw className="h-5 w-5"/></button><button aria-label="Zoom in" className="rounded-lg bg-white/10 p-2" onClick={()=>adjust(scale+.25)}><Plus className="h-5 w-5"/></button><button aria-label="Close image" className="rounded-lg bg-white/10 p-2" onClick={()=>setImage(null)}><X className="h-5 w-5"/></button></div></div>
    <div className="flex-1 overflow-auto overscroll-contain p-3" style={{touchAction:"pinch-zoom"}} onClick={e=>e.stopPropagation()}><div className="grid min-h-full place-items-center"><img src={image.src} alt={image.alt} draggable={false} className="max-w-none select-none object-contain transition-all" style={{width:`${scale*100}%`,maxHeight:scale===1?"calc(100dvh - 90px)":undefined}}/></div></div>
  </div>;
}
