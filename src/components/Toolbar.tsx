type ToolbarProps = {
  onPlayAll: () => void;
  onPauseAll: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddElement?: () => void;
};

export function Toolbar({
  onPlayAll,
  onPauseAll,
  onAddImage,
  onAddVideo,
  onAddElement,
}: ToolbarProps) {
  return (
    <div className="wb-controls">
      <button onClick={onPlayAll} className="btn">Play all videos</button>
      <button onClick={onPauseAll} className="btn">Pause all videos</button>
      <button onClick={onAddImage} className="btn btn-blue">Add image via URL</button>
      <button onClick={onAddVideo} className="btn btn-blue">Add video via URL</button>
      {onAddElement && (
        <button onClick={onAddElement} className="btn btn-blue">Add Element</button>
      )}
    </div>
  );
}

export default Toolbar;
