// Core whiteboard types for pure state (no graphics libs here)

export type ItemType = 'image' | 'video';

export interface BaseItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
}

export interface ImageItem extends BaseItem {
  type: 'image';
  url: string;
  format: string;
}

export interface VideoItem extends BaseItem {
  type: 'video';
  url: string;
  isPlaying: boolean;
  format: string;
}

export type CanvasItem = ImageItem | VideoItem;