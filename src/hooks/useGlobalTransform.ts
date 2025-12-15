import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import {
  computeScaledRectFromAnchor,
  angleDeltaAroundCenter,
  topLeftFromCenter,
} from '../components/helpers/transformMath';
import { TRANSFORM_MIN_SIZE } from '../config/constants';

export type TransformState =
  | null
  | ({
      id: string;
      startX: number;
      startY: number;
      objX: number;
      objY: number;
      width: number;
      height: number;
      rotation: number;
    } & (
      | {
          mode: 'scale';
          handle: 'nw' | 'ne' | 'sw' | 'se';
          anchorWX: number;
          anchorWY: number;
        }
      | {
          mode: 'rotate';
          cx: number;
          cy: number;
        }
    ));

export function useGlobalTransform(ref: { current: TransformState }) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = ref.current;
      if (!st) return;
      const store = useCanvasStore.getState();
      const worldX = e.clientX - store.viewport.x;
      const worldY = e.clientY - store.viewport.y;

      if (st.mode === 'scale') {
        const next = computeScaledRectFromAnchor({
          anchorWX: st.anchorWX,
          anchorWY: st.anchorWY,
          pointerWX: worldX,
          pointerWY: worldY,
          rotation: st.rotation ?? 0,
          minSize: TRANSFORM_MIN_SIZE,
        });
        useCanvasStore.getState().updateObject(st.id, next as any);
      } else if (st.mode === 'rotate') {
        const delta = angleDeltaAroundCenter(st.startX, st.startY, worldX, worldY, st.cx, st.cy);
        const rot = (st.rotation ?? 0) + delta;
        const tl = topLeftFromCenter(st.cx, st.cy, st.width, st.height, rot);
        useCanvasStore.getState().updateObject(st.id, { rotation: rot, x: tl.x, y: tl.y } as any);
      }
    };
    const onUp = () => {
      if (ref.current) ref.current = null;
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

export default useGlobalTransform;
