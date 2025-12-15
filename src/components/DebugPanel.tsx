import { useEffect, useMemo, useState } from 'react';
import { canvasStore, useCanvasStore } from '../store/canvasStore';
import { DEBUG_IMAGE_URLS, DEBUG_VIDEO_URLS } from '../debug/debugConfig';
import {
  SPAWN_RANGE_MIN_FACTOR,
  SPAWN_RANGE_MAX_FACTOR,
  DEBUG_IMG_MIN_W,
  DEBUG_IMG_W_SPREAD,
  DEBUG_IMG_ASPECT,
  DEBUG_VID_MIN_W,
  DEBUG_VID_W_SPREAD,
  DEBUG_VID_ASPECT,
} from '../config/constants';

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
      if (aabbIntersects(o.x, o.y, o.width, o.height, screenLeft, screenTop, screenRight - screenLeft, screenBottom - screenTop)) {
        visible++;
      }
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
      const iw = DEBUG_IMG_MIN_W + Math.floor(Math.random() * DEBUG_IMG_W_SPREAD);
      const ih = Math.floor(iw * DEBUG_IMG_ASPECT);
      // Spread positions within ~1.5x the canvas size (centered around the viewport)
      const x = Math.floor(randBetween(SPAWN_RANGE_MIN_FACTOR * w, SPAWN_RANGE_MAX_FACTOR * w));
      const y = Math.floor(randBetween(SPAWN_RANGE_MIN_FACTOR * h, SPAWN_RANGE_MAX_FACTOR * h));
      canvasStore.getState().addObject({ type: 'image', src, x, y, width: iw, height: ih } as any);
    }
  };

  const addRandomVideos = (count: number) => {
    const w = size.w;
    const h = size.h;
    for (let i = 0; i < count; i++) {
      const src = DEBUG_VIDEO_URLS[Math.floor(Math.random() * DEBUG_VIDEO_URLS.length)];
      const vw = DEBUG_VID_MIN_W + Math.floor(Math.random() * DEBUG_VID_W_SPREAD);
      const vh = Math.floor(vw * DEBUG_VID_ASPECT);
      // distribute across 1.5x the screen
      const x = Math.floor(randBetween(SPAWN_RANGE_MIN_FACTOR * w, SPAWN_RANGE_MAX_FACTOR * w));
      const y = Math.floor(randBetween(SPAWN_RANGE_MIN_FACTOR * h, SPAWN_RANGE_MAX_FACTOR * h));
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

// Axis-aligned bounding-box intersection test
function aabbIntersects(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  const aRight = ax + aw;
  const aBottom = ay + ah;
  const bRight = bx + bw;
  const bBottom = by + bh;
  return aRight >= bx && ax <= bRight && aBottom >= by && ay <= bBottom;
}

export default DebugPanel;
