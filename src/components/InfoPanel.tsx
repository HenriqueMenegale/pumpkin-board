type InfoPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function InfoPanel({ open, onClose }: InfoPanelProps) {
  if (!open) return null;
  return (
    <div className="wb-info-panel" role="dialog" aria-label="Info & Shortcuts">
      <div className="wb-debug-header">
        <span className="wb-debug-title">Info & Shortcuts</span>
        <button className="icon-button" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="wb-debug-row wb-info-content">
        <ul className="wb-info-list">
          <li><strong>Space</strong>: Hold to pan the canvas (grab/grabbing cursor)</li>
          <li><strong>Delete / Backspace</strong>: Delete the selected layer (ignored while typing)</li>
          <li><strong>Click</strong>: Select an element (or click in Layers sidebar)</li>
          <li><strong>Drag</strong>: Move selected element on canvas</li>
          <li><strong>Scale</strong>: Drag any of the four corner handles on selection frame</li>
          <li><strong>Rotate</strong>: Drag the circular handle above the selection frame (rotates around center)</li>
          <li><strong>Reorder</strong> (Layers sidebar): Drag-and-drop layers to change stacking order</li>
          <li><strong>Images</strong>: Blend mode can be changed in the Properties panel</li>
          <li><strong>Videos</strong>: Per-video controls appear when a video is selected (Play/Pause)</li>
          <li><strong>Add by URL</strong>: Use toolbar buttons to add Images or Videos</li>
          <li><strong>Debug</strong>: Seed many items and view visibility stats</li>
        </ul>
      </div>
    </div>
  );
}

export default InfoPanel;
