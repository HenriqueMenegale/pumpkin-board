import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type BaseObject = {
  id: string;
  type: 'rect' | 'image' | 'video';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type RectObject = BaseObject & {
  type: 'rect';
  fill?: number;
  alpha?: number;
  stroke?: { color?: number; width?: number; alpha?: number } | null;
};

export type ImageObject = BaseObject & {
  type: 'image';
  src: string;
  naturalWidth?: number;
  naturalHeight?: number;
};

export type VideoObject = BaseObject & {
  type: 'video';
  src: string;
  muted?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  playing?: boolean;
  volume?: number;
  currentTime?: number;
};

export type CanvasObject = RectObject | ImageObject | VideoObject;

type Updater<T> = Partial<T> | ((prev: T) => Partial<T>);

type CanvasState = {
  objects: CanvasObject[];
  selectedId: string | null;
  viewport: { x: number; y: number };
  panningMode: boolean;
  addObject: (obj: Omit<CanvasObject, 'id'> & { id?: string }) => string;
  updateObject: (id: string, patch: Updater<CanvasObject>) => void;
  removeObject: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveObject: (id: string, toIndex: number) => void;
  clear: () => void;
  playVideo: (id: string) => void;
  pauseVideo: (id: string) => void;
  playAllVideos: () => void;
  pauseAllVideos: () => void;
  selectObject: (id: string | null) => void;
  clearSelection: () => void;
  setViewport: (pos: { x: number; y: number }) => void;
  panBy: (dx: number, dy: number) => void;
  setPanningMode: (on: boolean) => void;
};

export const useCanvasStore = create<CanvasState>((set) => ({
  objects: [],
  selectedId: null,
  viewport: { x: 0, y: 0 },
  panningMode: false,

  addObject: (obj) => {
    const id = obj.id ?? uuidv4();
    const withId = { ...obj, id } as CanvasObject;
    set((state) => ({ objects: [...state.objects, withId] }));
    return id;
  },

  updateObject: (id, patch) => {
    set((state) => ({
      objects: state.objects.map((o) => {
        if (o.id !== id) return o;
        const delta = typeof patch === 'function' ? patch(o) : patch;
        return { ...o, ...delta } as CanvasObject;
      }),
    }));
  },

  removeObject: (id) => {
    set((state) => ({
      objects: state.objects.filter((o) => o.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  bringToFront: (id) => {
    set((state) => {
      const idx = state.objects.findIndex((o) => o.id === id);
      if (idx === -1) return {} as any;
      const arr = state.objects.slice();
      const [item] = arr.splice(idx, 1);
      arr.push(item);
      return { objects: arr };
    });
  },

  sendToBack: (id) => {
    set((state) => {
      const idx = state.objects.findIndex((o) => o.id === id);
      if (idx === -1) return {} as any;
      const arr = state.objects.slice();
      const [item] = arr.splice(idx, 1);
      arr.unshift(item);
      return { objects: arr };
    });
  },

  moveObject: (id, toIndex) => {
    set((state) => {
      const from = state.objects.findIndex((o) => o.id === id);
      if (from === -1 || from === toIndex) return {};

      const to = Math.max(0, Math.min(state.objects.length - 1, toIndex));
      if (from === to) return {};

      const newObjects = [...state.objects];
      const [item] = newObjects.splice(from, 1);
      newObjects.splice(to, 0, item);

      return { objects: newObjects };
    });
  },

  clear: () => set({ objects: [] }),

  playVideo: (id) => {
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id && o.type === 'video' ? ({ ...o, playing: true } as CanvasObject) : o
      ),
    }));
  },

  pauseVideo: (id) => {
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id && o.type === 'video' ? ({ ...o, playing: false } as CanvasObject) : o
      ),
    }));
  },

  playAllVideos: () => {
    set((state) => ({
      objects: state.objects.map((o) => (o.type === 'video' ? ({ ...o, playing: true } as CanvasObject) : o)),
    }));
  },

  pauseAllVideos: () => {
    set((state) => ({
      objects: state.objects.map((o) => (o.type === 'video' ? ({ ...o, playing: false } as CanvasObject) : o)),
    }));
  },

  selectObject: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),

  setViewport: (pos) => set({ viewport: { x: pos.x, y: pos.y } }),
  panBy: (dx, dy) => set((state) => ({ viewport: { x: state.viewport.x + dx, y: state.viewport.y + dy } })),
  setPanningMode: (on) => set({ panningMode: on }),
}));

export const canvasStore = {
  getState: () => useCanvasStore.getState(),
  subscribe: useCanvasStore.subscribe,
};
