import { FiPlay, FiPause, FiImage, FiVideo, FiTool, FiInfo } from 'react-icons/fi';

type ToolbarProps = {
  onPlayAll: () => void;
  onPauseAll: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddElement?: () => void;
  onToggleDebug?: () => void;
  onToggleInfo?: () => void;
};

export function Toolbar({
  onPlayAll,
  onPauseAll,
  onAddImage,
  onAddVideo,
  onToggleDebug,
  onToggleInfo,
}: ToolbarProps) {
  return (
    <div className="wb-controls">
      <button
        onClick={onPlayAll}
        className="btn btn-icon"
        aria-label="Play all videos"
        title="Play all videos"
      >
        <FiPlay className="icon" />
        <span className="icon-text">Play all</span>
      </button>
      <button
        onClick={onPauseAll}
        className="btn btn-icon"
        aria-label="Pause all videos"
        title="Pause all videos"
      >
        <FiPause className="icon" />
        <span className="icon-text">Pause all</span>
      </button>
      <button
        onClick={onAddImage}
        className="btn btn-blue btn-icon"
        aria-label="Add image via URL"
        title="Add image via URL"
      >
        <FiImage className="icon" />
        <span className="icon-text">Add image</span>
      </button>
      <button
        onClick={onAddVideo}
        className="btn btn-blue btn-icon"
        aria-label="Add video via URL"
        title="Add video via URL"
      >
        <FiVideo className="icon" />
        <span className="icon-text">Add video</span>
      </button>
      {onToggleDebug && (
        <button
          onClick={onToggleDebug}
          className="btn btn-icon"
          aria-label="Debug menu"
          title="Debug menu"
        >
          <FiTool className="icon" />
          <span className="icon-text">Debug</span>
        </button>
      )}
      {onToggleInfo && (
        <button
          onClick={onToggleInfo}
          className="btn btn-icon"
          aria-label="Info & Shortcuts"
          title="Info & Shortcuts"
        >
          <FiInfo className="icon" />
          <span className="icon-text">Info</span>
        </button>
      )}
    </div>
  );
}

export default Toolbar;
