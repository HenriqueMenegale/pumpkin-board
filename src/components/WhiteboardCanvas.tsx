import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

export function WhiteboardCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const app = new Application();
    let destroyed = false;
    let appended = false;
    let initPromise: Promise<void> | null = null;
        let canvasEl: HTMLCanvasElement | null = null;

    initPromise = (async () => {
      try {
        await app.init({
          resizeTo: window,
          background: '#111111',
          antialias: true,
        });
        if (destroyed) return;
        canvasEl = app.canvas;
        if (canvasEl) {
          mountRef.current?.appendChild(canvasEl);
          appended = true;
        }
      } catch(error) {
        console.error("failed", error);
      }
    })();

    return () => {
      destroyed = true;
      const finalize = () => {
        try {
          if (canvasEl && mountRef.current && appended && canvasEl.parentElement === mountRef.current) {
            mountRef.current.removeChild(canvasEl);
          }
          appended = false;
          canvasEl = null;

          app.destroy(true);
        } catch (error){
          console.error("failed to destroy", error)
        }
      };

      if (initPromise) {
        initPromise.finally(finalize);
      } else {
        finalize();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#111111',
      }}
    />
  );
}

export default WhiteboardCanvas;
