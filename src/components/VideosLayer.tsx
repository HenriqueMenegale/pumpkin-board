import { useEffect, useMemo, useRef } from 'react';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';
import {
  createPlaceholderSprite,
  setupSpriteInteractivity,
  updateSelectionOutline,
  updateSpriteTransform,
} from './helpers/layerHelpers';
import { useGlobalDrag } from '../hooks/useGlobalDrag';

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
          // add a placeholder sprite
          const latest = useCanvasStore.getState().objects.find((o) => o.id === obj.id) as any;
          const s = createPlaceholderSprite({
            id: obj.id,
            x: latest?.x ?? obj.x,
            y: latest?.y ?? obj.y,
            width: latest?.width ?? obj.width,
            height: latest?.height ?? obj.height,
            rotation: latest?.rotation ?? obj.rotation ?? 0,
          } as any);

          // Interactivity for selection/dragging
          setupSpriteInteractivity(s, obj.id, (v) => (dragRef.current = v));

          // z-order within the shared scene follows global objects array index
          const globalIndex = state.objects.findIndex((oo) => oo.id === obj.id);
          (s as any).zIndex = Number.isFinite(globalIndex) ? globalIndex : 0;
          container.addChild(s);
          entries.set(obj.id, { sprite: s });

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
          updateSpriteTransform(sprite, obj as any);
          const globalIndex = state.objects.findIndex((oo) => oo.id === (obj as any).id);
          (sprite as any).zIndex = Number.isFinite(globalIndex) ? globalIndex : 0;
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
          entry.outline = updateSelectionOutline(container, entry.outline, obj as any, selectedId);
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

  // shared drag wiring
  useGlobalDrag(dragRef);

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
