import { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';

export function PropertiesPanel() {
  const objects = useCanvasStore((s) => s.objects);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const updateObject = useCanvasStore((s) => s.updateObject);

  const selected = useMemo(() => objects.find((o) => o.id === selectedId) ?? null, [objects, selectedId]);

  if (!selected) {
    return (
      <div className="wb-props" aria-live="polite">
        <div className="wb-props-row">
          <span className="text-muted">Select an element to see its properties.</span>
        </div>
      </div>
    );
  }

  const rotationDeg = selected.rotation ? Math.round((selected.rotation * 180) / Math.PI) : 0;

  let url: string | undefined;
  if ((selected as any).src) url = (selected as any).src as string;

  const format = url ? inferFormat(url) : selected.type === 'rect' ? 'vector' : 'unknown';

  return (
    <div className="wb-props" aria-label="Properties">
      <div className="wb-props-row">
        <Prop label="Type" value={capitalize(selected.type)} />
        <div className="wb-prop" role="group" aria-label="Position">
          <span className="wb-prop-label">Position</span>
          <span className="wb-sublabel">X</span>
          <input
            className="wb-input wb-input-sm"
            type="number"
            value={Math.round(selected.x)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) updateObject(selected.id, { x: v });
            }}
          />
          <span className="wb-sublabel">Y</span>
          <input
            className="wb-input wb-input-sm"
            type="number"
            value={Math.round(selected.y)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) updateObject(selected.id, { y: v });
            }}
          />
        </div>

        <div className="wb-prop" role="group" aria-label="Size">
          <span className="wb-prop-label">Size</span>
          <span className="wb-sublabel">W</span>
          <input
            className="wb-input wb-input-sm"
            type="number"
            min={0}
            value={Math.round(selected.width)}
            onChange={(e) => {
              let v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              if (v < 0) v = 0;
              updateObject(selected.id, { width: v });
            }}
          />
          <span className="wb-sublabel">H</span>
          <input
            className="wb-input wb-input-sm"
            type="number"
            min={0}
            value={Math.round(selected.height)}
            onChange={(e) => {
              let v = Number(e.target.value);
              if (!Number.isFinite(v)) return;
              if (v < 0) v = 0;
              updateObject(selected.id, { height: v });
            }}
          />
        </div>

        <div className="wb-prop" role="group" aria-label="Rotation">
          <span className="wb-prop-label">Rotation</span>
          <input
            className="wb-input wb-input-sm"
            type="number"
            value={rotationDeg}
            onChange={(e) => {
              const deg = Number(e.target.value);
              if (!Number.isFinite(deg)) return;
              const rad = (deg * Math.PI) / 180;
              updateObject(selected.id, { rotation: rad } as any);
            }}
          />
          <span className="wb-suffix">°</span>
        </div>

        {url && <Prop label="Format" value={format} />}
        {url && (
          <div className="wb-prop wb-prop-url" title={url}>
            <span className="wb-prop-label">URL</span>
            <span className="wb-prop-value code-inline">{url}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Prop({ label, value }: { label: string; value: string }) {
  return (
    <div className="wb-prop">
      <span className="wb-prop-label">{label}</span>
      <span className="wb-prop-value">{value}</span>
    </div>
  );
}

function inferFormat(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    const pathname = u.pathname || '';
    const m = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return m ? m[1].toLowerCase() : 'unknown';
  } catch {
    const m = url.match(/\.([a-zA-Z0-9]+)(\?|#|$)/);
    return m ? m[1].toLowerCase() : 'unknown';
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default PropertiesPanel;
