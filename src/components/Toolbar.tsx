type ToolbarProps = {
  onPlayAll: () => void;
  onPauseAll: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddElement?: () => void;
  onToggleDebug?: () => void;
};

export function Toolbar({
  onPlayAll,
  onPauseAll,
  onAddImage,
  onAddVideo,
  onToggleDebug,
}: ToolbarProps) {
  return (
    <div className="wb-controls">
      <button onClick={onPlayAll} className="btn">Play all videos</button>
      <button onClick={onPauseAll} className="btn">Pause all videos</button>
      <button onClick={onAddImage} className="btn btn-blue">Add image via URL</button>
      <button onClick={onAddVideo} className="btn btn-blue">Add video via URL</button>
      {onToggleDebug && (
        <button onClick={onToggleDebug} className="btn">Debug</button>
      )}
    </div>
  );
}

export default Toolbar;
