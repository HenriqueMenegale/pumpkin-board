import { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export function LayersSidebar() {
  const objects = useCanvasStore((s) => s.objects);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const removeObject = useCanvasStore((s) => s.removeObject);

  const items = useMemo(() => [...objects].reverse(), [objects]);

  return (
    <aside className="wb-sidebar" aria-label="Layers">
      <div className="wb-sidebar-header">Layers</div>
      <ul className="wb-layer-list">
        {items.map((o) => {
          const label = o.type === 'image'
            ? `Image` + (('src' in o && o.src) ? ` · ${shorten(o.src)}` : '')
            : o.type === 'video'
            ? `Video` + (('src' in o && o.src) ? ` · ${shorten(o.src)}` : '')
            : `Rectangle ${o.width}×${o.height}`;
          const active = selectedId === o.id;
          return (
            <li key={o.id}>
              <div
                className={`wb-layer-item${active ? ' active' : ''}`}
                onClick={() => selectObject(o.id)}
                title={`${o.type} (${o.width}×${o.height}) at ${o.x},${o.y}`}
                role="button"
                tabIndex={0}
              >
                <span className={`wb-layer-dot wb-layer-${o.type}`}></span>
                <span className="wb-layer-text">{label}</span>
                <span className="wb-layer-grow" />
                <button
                  className="icon-button"
                  aria-label="Delete layer"
                  title="Delete layer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObject(o.id);
                  }}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="wb-layer-empty">No elements yet</li>
        )}
      </ul>
    </aside>
  );
}

function shorten(url: string, max = 28) {
  try {
    const u = new URL(url, window.location.origin);
    const s = u.href.replace(u.origin, '').replace(/^\//, '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  } catch {
    return url.length > max ? url.slice(0, max - 1) + '…' : url;
  }
}

export default LayersSidebar;
