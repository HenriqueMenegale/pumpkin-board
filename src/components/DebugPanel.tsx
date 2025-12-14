import { useEffect, useMemo, useState } from 'react';
import { canvasStore, useCanvasStore } from '../store/canvasStore';
import { DEBUG_IMAGE_URLS, DEBUG_VIDEO_URLS } from '../debug/debugConfig';

type DebugPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const objects = useCanvasStore((s) => s.objects);
  const viewport = useCanvasStore((s) => s.viewport);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const stats = useMemo(() => {
    // screen size to randomize position later
    const screenLeft = -viewport.x;
    const screenTop = -viewport.y;
    const screenRight = screenLeft + size.w;
    const screenBottom = screenTop + size.h;

    let visible = 0;
    for (const o of objects) {
      const left = o.x;
      const top = o.y;
      const right = o.x + o.width;
      const bottom = o.y + o.height;
      const intersects = right >= screenLeft && left <= screenRight && bottom >= screenTop && top <= screenBottom;
      if (intersects) visible++;
    }
    const total = objects.length;
    const culled = Math.max(0, total - visible);
    return { total, visible, culled };
  }, [objects, viewport.x, viewport.y, size.w, size.h]);

  if (!open) return null;

  const addRandomImages = (count: number) => {
    const w = size.w;
    const h = size.h;
    for (let i = 0; i < count; i++) {
      const src = DEBUG_IMAGE_URLS[Math.floor(Math.random() * DEBUG_IMAGE_URLS.length)];
      const iw = 220 + Math.floor(Math.random() * 260); // 220..480
      const ih = Math.floor(iw * (2 / 3));
      // Spread positions within ~1.5x the canvas size (centered around the viewport)
      const x = Math.floor(randBetween(-0.25 * w, 1.25 * w));
      const y = Math.floor(randBetween(-0.25 * h, 1.25 * h));
      canvasStore.getState().addObject({ type: 'image', src, x, y, width: iw, height: ih } as any);
    }
  };

  const addRandomVideos = (count: number) => {
    const w = size.w;
    const h = size.h;
    for (let i = 0; i < count; i++) {
      const src = DEBUG_VIDEO_URLS[Math.floor(Math.random() * DEBUG_VIDEO_URLS.length)];
      const vw = 320 + Math.floor(Math.random() * 200); // 320..520
      const vh = Math.floor(vw * (9 / 16));
      // distribute across 1.5x the screen
      const x = Math.floor(randBetween(-0.25 * w, 1.25 * w));
      const y = Math.floor(randBetween(-0.25 * h, 1.25 * h));
      canvasStore.getState().addObject({
        type: 'video',
        src,
        x,
        y,
        width: vw,
        height: vh,
        muted: true,
        loop: true,
        autoplay: false,
        playing: false,
      } as any);
    }
  };

  return (
    <div className="wb-debug-panel" role="dialog" aria-label="Debug menu">
      <div className="wb-debug-header">
        <span className="wb-debug-title">Debug</span>
        <button className="icon-button" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="wb-debug-row">
        <button className="btn" onClick={() => addRandomImages(10)}>Add 10 images</button>
        <button className="btn" onClick={() => addRandomVideos(10)}>Add 10 videos</button>
      </div>
      <div className="wb-debug-stats">
        <div className="wb-prop"><span className="wb-prop-label">Total elements</span><span className="wb-prop-value">{stats.total}</span></div>
        <div className="wb-prop"><span className="wb-prop-label">Total visible</span><span className="wb-prop-value">{stats.visible}</span></div>
        <div className="wb-prop"><span className="wb-prop-label">Total culled</span><span className="wb-prop-value">{stats.culled}</span></div>
      </div>
      <div className="wb-debug-note small text-muted">URLs editable in <span className="code-inline">src/debug/debugConfig.ts</span></div>
    </div>
  );
}

function randBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default DebugPanel;
