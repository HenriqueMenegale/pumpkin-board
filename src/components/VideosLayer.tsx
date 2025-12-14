import { useEffect, useMemo, useRef } from 'react';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  container: Container | null;
}

export function VideosLayer({ container }: Props) {
  const spritesRef = useRef<Map<string, { sprite: Sprite; video?: HTMLVideoElement; outline?: Graphics }>>(new Map());
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const objects = useCanvasStore((s) => s.objects);
  const videos = useMemo(() => objects.filter((o: any) => o.type === 'video') as any[], [objects]);
  const playVideo = useCanvasStore((s) => s.playVideo);
  const pauseVideo = useCanvasStore((s) => s.pauseVideo);
  const viewport = useCanvasStore((s) => s.viewport);
  const dragRef = useRef<null | { id: string; dx: number; dy: number }>(null);
  // prevent duplicate sprite creations while waiting for canplay
  const pendingRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    if (!container) return;

    // ensure predictable draw order if any zIndex is used later
    (container as any).sortableChildren = true;

    const entries = spritesRef.current;
    let alive = true;

    const loadAndSwapVideoTexture = async (
      id: string,
      src: string,
      opts: {
        loop?: boolean;
        muted?: boolean;
        playing?: boolean;
        volume?: number;
        currentTime?: number;
      }
    ) => {
      const video = document.createElement('video');
      (video as any).crossOrigin = 'anonymous';
      video.src = src;
      video.loop = opts.loop ?? true;
      video.muted = opts.muted ?? true;
      (video as any).playsInline = true;
      video.preload = 'auto';
      if (typeof opts.volume === 'number') {
        try { video.volume = Math.min(1, Math.max(0, opts.volume)); } catch {}
      }
      if (typeof opts.currentTime === 'number' && !Number.isNaN(opts.currentTime)) {
        try { video.currentTime = Math.max(0, opts.currentTime); } catch {}
      }
      try {
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error(`Failed to load video: ${src}`)); };
          const cleanup = () => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
          };
          video.addEventListener('canplay', onCanPlay, { once: true });
          video.addEventListener('error', onError, { once: true });
          try { video.load(); } catch {}
        });
      } catch (e) {
        console.error(e);
        throw e;
      }

      if (!alive || !container || (container as any).destroyed) return;

      const entry = entries.get(id);
      if (!entry) return; // entry might have been removed

      // Swap the placeholder texture to the real video texture
      const texture = Texture.from(video);
      entry.sprite.texture = texture;
      (entry.sprite as any).tint = 0xFFFFFF; // clear placeholder tint
      entry.video = video;

      // Apply desired playing state
      if (useCanvasStore.getState().objects.find((o) => o.id === id && (o as any).playing)) {
        try { await video.play(); } catch {}
      }
    };

    const apply = async () => {
      const state = useCanvasStore.getState();
      const videos = state.objects.filter((o) => o.type === 'video') as ReturnType<typeof useCanvasStore.getState>['objects'];
      const selectedId = state.selectedId;
      const nextIds = new Set(videos.map((o) => (o as any).id));

      // cleanup routine
      for (const [id, entry] of entries) {
        if (!nextIds.has(id)) {
          entries.delete(id);
          if (entry.outline && entry.outline.parent === container) container.removeChild(entry.outline);
          entry.outline?.destroy();
          if (entry.sprite.parent === container) container.removeChild(entry.sprite);
          if (entry.video) { try { entry.video.pause(); } catch {} }
          entry.sprite.destroy({ children: true, texture: true });
        }
      }

      // Create or update
      for (const obj of videos as any[]) {
        const existing = entries.get(obj.id);
        if (!existing) {
          // Create a visible placeholder sprite immediately
          const s = new Sprite(Texture.WHITE);
          // Use latest values to avoid snapping after drags during async load
          const latest = useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any;
          const lx = latest?.x ?? obj.x;
          const ly = latest?.y ?? obj.y;
          const lw = latest?.width ?? obj.width;
          const lh = latest?.height ?? obj.height;
          const lr = latest?.rotation ?? obj.rotation ?? 0;

          s.x = lx;
          s.y = ly;
          s.rotation = lr;
          s.width = lw;
          s.height = lh;
          s.alpha = 1;
          s.visible = true;
          (s as any).renderable = true;
          (s as any).tint = 0xdddddd; // light placeholder tint

          // Interactivity for selection/dragging
          (s as any).eventMode = 'static';
          (s as any).cursor = 'pointer';
          s.on('pointerdown', (e: any) => {
            const st = useCanvasStore.getState();
            if (st.panningMode) return;
            const pos = e.global;
            const local = { x: pos.x - st.viewport.x, y: pos.y - st.viewport.y };
            st.selectObject(obj.id);
            dragRef.current = { id: obj.id, dx: local.x - s.x, dy: local.y - s.y };
            (s as any).cursor = 'grabbing';
          });
          s.on('pointerup', () => {
            dragRef.current = null;
            (s as any).cursor = 'pointer';
          });
          s.on('pointerupoutside', () => {
            dragRef.current = null;
            (s as any).cursor = 'pointer';
          });

          container.addChild(s);
          entries.set(obj.id, { sprite: s });

          // Coalesce async load-and-swap per id
          if (!pendingRef.current.has(obj.id)) {
            const p = (async () => {
              try {
                await loadAndSwapVideoTexture(obj.id, obj.src, obj);
              } catch (e) {
                console.error('Failed to load video', obj.src, e);
              } finally {
                pendingRef.current.delete(obj.id);
              }
            })();
            pendingRef.current.set(obj.id, p);
          }
        } else {
          const { sprite, video } = existing;
          sprite.x = obj.x;
          sprite.y = obj.y;
          sprite.rotation = obj.rotation ?? 0;
          sprite.width = obj.width;
          sprite.height = obj.height;
          sprite.alpha = 1;
          sprite.visible = true;

          if (video) {
            if (typeof obj.loop === 'boolean') video.loop = obj.loop;
            if (typeof obj.muted === 'boolean') video.muted = obj.muted;
            if (typeof obj.volume === 'number') {
              try { video.volume = Math.min(1, Math.max(0, obj.volume)); } catch {}
            }
            if (typeof obj.currentTime === 'number' && Math.abs(video.currentTime - obj.currentTime) > 0.25) {
              try { video.currentTime = Math.max(0, obj.currentTime); } catch {}
            }
            if (typeof obj.playing === 'boolean') {
              const wantsPlay = !!obj.playing;
              if (wantsPlay && video.paused) {
                try { await video.play(); } catch {}
              } else if (!wantsPlay && !video.paused) {
                try { video.pause(); } catch {}
              }
            }
          }
        }

        // selection outline per video
        const entry = entries.get((obj as any).id);
        if (entry) {
          const show = selectedId === (obj as any).id;
          if (show) {
            let outline = entry.outline;
            if (!outline) {
              outline = new Graphics();
              container.addChild(outline);
              entry.outline = outline;
            }
            outline.clear();
            // Mirror the sprite transform so the outline rotates with the video
            outline.position.set((obj as any).x, (obj as any).y);
            outline.rotation = (obj as any).rotation ?? 0;
            outline
              .rect(-2, -2, (obj as any).width + 4, (obj as any).height + 4)
              .stroke({ color: 0x3b82f6, width: 2 });
          } else if (entry.outline) {
            if (entry.outline.parent === container) container.removeChild(entry.outline);
            entry.outline.destroy();
            delete entry.outline;
          }
        }
      }
    };

    apply();

    const unsub = useCanvasStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects || state.selectedId !== prev.selectedId) apply();
    });
    unsubscribeRef.current = unsub;

    return () => {
      alive = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      for (const [, entry] of entries) {
        if (entry.outline && entry.outline.parent === container) container.removeChild(entry.outline);
        entry.outline?.destroy();
        if (entry.sprite.parent === container) container.removeChild(entry.sprite);
        if (entry.video) { try { entry.video.pause(); } catch {} }
        entry.sprite.destroy({ children: true, texture: true });
      }
      entries.clear();
      pendingRef.current.clear();
    };
  }, [container]);

  // handle drag
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const { id, dx, dy } = drag;
      const { viewport } = useCanvasStore.getState();
      const pos = { x: e.clientX - viewport.x, y: e.clientY - viewport.y };
      useCanvasStore.getState().updateObject(id, { x: pos.x - dx, y: pos.y - dy } as any);
    };
    const onUp = () => {
      if (dragRef.current) dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp as any);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp as any);
    };
  }, []);

  return (
    <>
      {videos.map((v) => (
        <div
          key={v.id}
          className="wb-video-float"
          style={{ left: v.x + viewport.x, top: v.y + v.height + 6 + viewport.y }}
        >
          <div className="wb-video-item">
            <span className="wb-video-label">Video</span>
            <button
              className="btn"
              onClick={() => playVideo(v.id)}
              disabled={!!v.playing}
            >
              Play
            </button>
            <button
              className="btn"
              onClick={() => pauseVideo(v.id)}
              disabled={!v.playing}
            >
              Pause
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

export default VideosLayer;
