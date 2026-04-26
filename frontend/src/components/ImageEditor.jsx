import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Move, Check, X, RotateCw } from 'lucide-react';

/**
 * ImageEditor — lets the user zoom and pan an image to choose a square crop.
 * Outputs a 600x600 base64 PNG via canvas. Universal, no extra deps.
 */
const ImageEditor = ({ src, onConfirm, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const onPointerDown = (e) => {
    setDragging(true);
    setStart({ x: e.clientX - tx, y: e.clientY - ty });
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    setTx(e.clientX - start.x);
    setTy(e.clientY - start.y);
  };
  const onPointerUp = () => setDragging(false);

  const handleConfirm = () => {
    if (!imgRef.current) return;
    const SIZE = 600;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    // Fill bg
    ctx.fillStyle = '#0B0E1A';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Mirror the visual transform on the canvas
    const container = containerRef.current.getBoundingClientRect();
    const scaleRatio = SIZE / container.width;
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.translate(tx * scaleRatio, ty * scaleRatio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    const img = imgRef.current;
    // Cover-fit original image inside the container at scale 1
    const ratio = Math.max(container.width / img.naturalWidth, container.height / img.naturalHeight);
    const baseW = img.naturalWidth * ratio * scaleRatio;
    const baseH = img.naturalHeight * ratio * scaleRatio;
    ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onConfirm(dataUrl);
  };

  return (
    <div className="space-y-3" data-testid="image-editor">
      <div
        ref={containerRef}
        className="relative aspect-square bg-ink-900 rounded-2xl overflow-hidden touch-none border border-white/10"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={() => setImgLoaded(true)}
          draggable={false}
          className="absolute top-1/2 left-1/2 select-none"
          style={{
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(${scale})`,
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
        {/* Crop guide */}
        <div className="absolute inset-2 border-2 border-primary-500/50 rounded-2xl pointer-events-none" />
        <div className="absolute top-2 left-2 bg-ink-950/70 backdrop-blur text-[10px] font-bold tracking-wider uppercase text-foreground/70 px-2 py-1 rounded-full flex items-center gap-1">
          <Move className="h-3 w-3" /> Arrastra para reencuadrar
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold tracking-widest uppercase text-foreground/60">Zoom</span>
            <span className="text-xs font-mono font-bold text-primary-500">{(scale * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
              data-testid="zoom-out-btn"
            ><ZoomOut className="h-4 w-4 text-foreground" /></button>
            <input
              type="range"
              min="0.5" max="3" step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-primary-500"
              data-testid="zoom-slider"
            />
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.1))}
              className="h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
              data-testid="zoom-in-btn"
            ><ZoomIn className="h-4 w-4 text-foreground" /></button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button" variant="outline"
            className="flex-1 h-11 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            data-testid="rotate-btn"
          ><RotateCw className="h-4 w-4 mr-1" /> Girar</Button>
          <Button
            type="button" variant="outline"
            className="flex-1 h-11 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground"
            onClick={() => { setScale(1); setTx(0); setTy(0); setRotation(0); }}
            data-testid="reset-edit-btn"
          >Reset</Button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground" onClick={onCancel} data-testid="cancel-edit-btn">
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button type="button" className="flex-1 h-12 rounded-2xl bg-primary-500 hover:bg-primary-400 text-ink-950 font-bold shadow-neon-cyan" onClick={handleConfirm} disabled={!imgLoaded} data-testid="confirm-edit-btn">
            <Check className="h-4 w-4 mr-1" /> Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
