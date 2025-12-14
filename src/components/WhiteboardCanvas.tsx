import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { canvasStore, useCanvasStore } from '../store/canvasStore';
import { UrlModal } from './UrlModal';
import { ImagesLayer } from './ImagesLayer';

export function WhiteboardCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [imgUrlOpen, setImgUrlOpen] = useState(false);
  const [imagesContainer, setImagesContainer] = useState<Container | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const app = new Application();
    let destroyed = false;
    let appended = false;
    let initPromise: Promise<void> | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let scene: Container | null = null;
    let rectsContainer: Container | null = null;
    let imgsContainer: Container | null = null;
    let unsubscribe: (() => void) | null = null;

    initPromise = (async () => {
      try {
        await app.init({
          resizeTo: window,
          background: '#ffffff',
          antialias: true,
        });
        if (destroyed) return;
        canvasEl = app.canvas;
        if (canvasEl) {
          mountRef.current?.appendChild(canvasEl);
          appended = true;
        }

        // main containers for items
        scene = new Container();
        rectsContainer = new Container();
        imgsContainer = new Container();
        scene.addChild(rectsContainer);
        scene.addChild(imgsContainer);
        app.stage.addChild(scene);
        setImagesContainer(imgsContainer);

        const render = (objects: ReturnType<typeof canvasStore.getState>['objects']) => {
          if (!rectsContainer) return;
          // Clear only rectangles layer
          while (rectsContainer.children.length) {
            const child = rectsContainer.removeChildAt(0);
            child.destroy?.({ children: true });
          }

          for (const obj of objects) {
            if (obj.type === 'rect') {
              const g = new Graphics();
              const fill = (obj as any).fill ?? 0x2ecc71;
              const alpha = (obj as any).alpha ?? 1;
              g.rect(obj.x, obj.y, obj.width, obj.height).fill(fill, alpha);
              const stroke = (obj as any).stroke;
              if (stroke) {
                const sc = stroke.color ?? 0x000000;
                const sw = stroke.width ?? 1;
                const sa = stroke.alpha ?? 1;
                g.stroke({ color: sc, width: sw, alpha: sa });
              }
              if ((obj as any).rotation) {
                g.rotation = (obj as any).rotation;
              }
              rectsContainer.addChild(g);
            }
          }
        };

        render(canvasStore.getState().objects);
        unsubscribe = useCanvasStore.subscribe((state, prev) => {
          if (state.objects !== prev.objects) {
            render(state.objects);
          }
        });

        const st = canvasStore.getState();
        if (st.objects.length === 0) {
          st.addObject({
            type: 'rect',
            x: 120,
            y: 120,
            width: 240,
            height: 140,
            fill: 0x2ecc71,
          } as any);
        }
      } catch(error) {
        console.error("failed", error);
      }
    })();

    return () => {
      destroyed = true;
      const finalize = () => {
        try {

          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }

          if (scene) {
            // Destroy sub-containers first
            if (rectsContainer) {
              rectsContainer.destroy({ children: true });
              rectsContainer = null;
            }
            if (imgsContainer) {
              imgsContainer.destroy({ children: true });
              imgsContainer = null;
            }
            scene.destroy({ children: true });
            scene = null;
          }
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
    <div ref={mountRef} className="wb-root">
      {/* Images layer mounts once Pixi container is ready */}
      <ImagesLayer container={imagesContainer} />
      {/* Overlay controls */}
      <div className="wb-controls">
        <button
          onClick={() => {
            canvasStore.getState().addObject({
              type: 'rect',
              x: Math.random() * 250,
              y: Math.random() * 250,
              width: 240,
              height: 140,
              fill: 0x2ecc71,
            } as any);
          }}
          className="btn btn-green"
        >
          Add green rectangle
        </button>
        <button
          onClick={() => setImgUrlOpen(true)}
          className="btn btn-blue"
        >
          Add image via URL
        </button>
        <button
          onClick={() => setUrlOpen(true)}
          className="btn btn-blue"
        >
          Add Element
        </button>
      </div>

      {/* Image URL modal */}
      <UrlModal
        open={imgUrlOpen}
        title="Add image"
        placeholder="https://example.com/image.png"
        submitLabel="Add image"
        onClose={() => setImgUrlOpen(false)}
        onSubmit={(url) => {
          // Add an image object using the store-driven rendering via ImagesLayer
          canvasStore.getState().addObject({
            type: 'image',
            src: url,
            x: 100,
            y: 100,
            width: 300,
            height: 200,
          } as any);
          setImgUrlOpen(false);
        }}
      />

      <UrlModal
        open={urlOpen}
        onClose={() => setUrlOpen(false)}
        onSubmit={(url) => {
          console.log('worked:', url);
          setUrlOpen(false);
        }}
      />
    </div>
  );
}

export default WhiteboardCanvas;
