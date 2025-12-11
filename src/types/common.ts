export interface CanvasObject {
    id: string;
    width: number;
    height: number;
    type: string;
    x: number;
    y: number;
    src: string;
    rotation: number;
    //properties is an object with any values inside
    properties: object;
}
export interface CanvasState {
    objects: CanvasObject[];
}