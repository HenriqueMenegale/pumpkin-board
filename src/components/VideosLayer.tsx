import { useEffect, useMemo, useRef } from 'react';
import { Container, Sprite, Texture } from 'pixi.js';
import { useCanvasStore } from '../store/canvasStore';

interface Props {
  container: Container | null;
}

export function VideosLayer({ container }: Props) {
  const spritesRef = useRef<Map<string, { sprite: Sprite; video: HTMLVideoElement }>>(new Map());
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const objects = useCanvasStore((s) => s.objects);
  const videos = useMemo(() => objects.filter((o: any) => o.type === 'video') as any[], [objects]);
  const playVideo = useCanvasStore((s) => s.playVideo);
  const pauseVideo = useCanvasStore((s) => s.pauseVideo);

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
      const videos = useCanvasStore
        .getState()
        .objects.filter((o) => o.type === 'video') as ReturnType<typeof useCanvasStore.getState>['objects'];
      const nextIds = new Set(videos.map((o) => (o as any).id));

      // cleanup routine
      for (const [id, { sprite, video }] of entries) {
        if (!nextIds.has(id)) {
          entries.delete(id);
          if (sprite.parent === container) container.removeChild(sprite);
          try { video.pause(); } catch {}
          sprite.destroy({ children: true, texture: true, baseTexture: true });
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
          // runtime playback options updates
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
    };

    apply();

    const unsub = useCanvasStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects) apply();
    });
    unsubscribeRef.current = unsub;

    return () => {
      alive = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      for (const [, { sprite, video }] of entries) {
        if (sprite.parent === container) container.removeChild(sprite);
        try { video.pause(); } catch {}
        sprite.destroy({ children: true, texture: true, baseTexture: true });
      }
      entries.clear();
    };
  }, [container]);

  return (
    <>
      {videos.map((v) => (
        <div
          key={v.id}
          className="wb-video-float"
          style={{ left: v.x, top: v.y + v.height + 6 }}
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
