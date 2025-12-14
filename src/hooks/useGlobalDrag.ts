import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';

// Local copy of DragState type to avoid coupling hooks to component helpers
export type DragState = { id: string; dx: number; dy: number } | null;

// React hook to wire a shared global drag handler for layers
export function useGlobalDrag(dragRef: { current: DragState }) {
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
}

export default useGlobalDrag;
