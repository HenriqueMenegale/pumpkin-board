import { useEffect, useMemo, useRef } from 'react';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  container: Container | null;
}

export function VideosLayer({ container }: Props) {
  const spritesRef = useRef<Map<string, { sprite: Sprite; video: HTMLVideoElement; outline?: Graphics }>>(new Map());
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const objects = useCanvasStore((s) => s.objects);
  const videos = useMemo(() => objects.filter((o: any) => o.type === 'video') as any[], [objects]);
  const playVideo = useCanvasStore((s) => s.playVideo);
  const pauseVideo = useCanvasStore((s) => s.pauseVideo);
  const viewport = useCanvasStore((s) => s.viewport);
  const dragRef = useRef<null | { id: string; dx: number; dy: number }>(null);

  useEffect(() => {
    if (!container) return;

    const entries = spritesRef.current;
    let alive = true;

    const createVideoSprite = async (
      id: string,
      src: string,
      opts: {
        x: number;
        y: number;
        width: number;
        height: number;
        rotation?: number;
        muted?: boolean;
        loop?: boolean;
        autoplay?: boolean; // @todo need to recheck docs
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
        // Wait for the video to be able to play before creating texture
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error(`Failed to load video: ${src}`));
          };
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

      const texture = Texture.from(video);
      const sprite = new Sprite(texture);
      sprite.x = opts.x;
      sprite.y = opts.y;
      sprite.rotation = opts.rotation ?? 0;
      sprite.width = opts.width;
      sprite.height = opts.height;

      // interactivity for selection/dragging
      (sprite as any).eventMode = 'static';
      (sprite as any).cursor = 'pointer';
      sprite.on('pointerdown', (e: any) => {
        const st = useCanvasStore.getState();
        if (st.panningMode) return; // disable item drag while panning
        const pos = e.global;
        const local = { x: pos.x - st.viewport.x, y: pos.y - st.viewport.y };
        st.selectObject(id);
        // use the sprite's live position to compute drag offset
        dragRef.current = { id, dx: local.x - sprite.x, dy: local.y - sprite.y };
        (sprite as any).cursor = 'grabbing';
      });
      sprite.on('pointerup', () => {
        dragRef.current = null;
        (sprite as any).cursor = 'pointer';
      });
      sprite.on('pointerupoutside', () => {
        dragRef.current = null;
        (sprite as any).cursor = 'pointer';
      });

      container.addChild(sprite);
      entries.set(id, { sprite, video });

      // control inicial playing state
      if (opts.playing) {
        try {
          await video.play();
        } catch (error) {
            console.error(error);
        }
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
          try { entry.video.pause(); } catch {}
          entry.sprite.destroy({ children: true, texture: true, baseTexture: true });
        }
      }

      // Create or update
      for (const obj of videos as any[]) {
        const existing = entries.get(obj.id);
        if (!existing) {
          try {
            await createVideoSprite(obj.id, obj.src, obj);
          } catch (e) {
            console.error('Failed to load video', obj.src, e);
          }
        } else {
          const { sprite, video } = existing;
          sprite.x = obj.x;
          sprite.y = obj.y;
          sprite.rotation = obj.rotation ?? 0;
          sprite.width = obj.width;
          sprite.height = obj.height;

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

        // selection outline per video
        const entry = entries.get((obj as any).id)!;
        const show = selectedId === (obj as any).id;
        if (show) {
          let outline = entry.outline;
          if (!outline) {
            outline = new Graphics();
            container.addChild(outline);
            entry.outline = outline;
          }
          outline.clear();
          outline.rect((obj as any).x - 2, (obj as any).y - 2, (obj as any).width + 4, (obj as any).height + 4).stroke({ color: 0x3b82f6, width: 2 });
        } else if (entry.outline) {
          if (entry.outline.parent === container) container.removeChild(entry.outline);
          entry.outline.destroy();
          delete entry.outline;
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
        try { entry.video.pause(); } catch {}
        entry.sprite.destroy({ children: true, texture: true, baseTexture: true });
      }
      entries.clear();
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
      useCanvasStore.getState().updateObject(id, (prev: any) => ({ x: pos.x - dx, y: pos.y - dy }));
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
