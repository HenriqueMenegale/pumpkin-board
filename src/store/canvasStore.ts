import { create } from "zustand/react";

interface CanvasObject {
    id: string;
    width: number;
    height: number;
    type: string;
    x: number;
    y: number;
    src: string;
    rotation: number;
}
interface CanvasState {
    objects: CanvasObject[];
}