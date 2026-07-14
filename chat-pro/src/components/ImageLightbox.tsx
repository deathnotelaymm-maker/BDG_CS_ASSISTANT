import { useEffect, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

export function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", key); };
  }, [onClose]);
  const adjust = (next: number) => setScale(Math.max(0.5, Math.min(4, next)));
  return <div role="dialog" aria-modal="true" aria-label="Image preview" className="fixed inset-0 z-[100] flex flex-col bg-black/95" onClick={onClose}>
    <div className="flex items-center justify-between gap-2 border-b border-white/15 p-3 text-white" onClick={(e)=>e.stopPropagation()}>
      <span className="truncate text-xs text-white/70">Tap + or use two fingers to enlarge the image</span>
      <div className="flex gap-2">
        <button aria-label="Zoom out" className="rounded-lg bg-white/10 p-2" onClick={()=>adjust(scale-.25)}><Minus className="h-5 w-5"/></button>
        <button aria-label="Reset zoom" className="rounded-lg bg-white/10 p-2" onClick={()=>setScale(1)}><RotateCcw className="h-5 w-5"/></button>
        <button aria-label="Zoom in" className="rounded-lg bg-white/10 p-2" onClick={()=>adjust(scale+.25)}><Plus className="h-5 w-5"/></button>
        <button aria-label="Close image" className="rounded-lg bg-white/10 p-2" onClick={onClose}><X className="h-5 w-5"/></button>
      </div>
    </div>
    <div className="flex-1 overflow-auto overscroll-contain p-3" style={{ touchAction:"pinch-zoom" }} onClick={(e)=>e.stopPropagation()}>
      <div className="grid min-h-full place-items-center">
        <img src={src} alt={alt || "Support visual preview"} draggable={false} className="max-w-none select-none object-contain transition-transform" style={{ width:`${scale * 100}%`, maxHeight:scale === 1 ? "calc(100dvh - 90px)" : undefined }} />
      </div>
    </div>
  </div>;
}
