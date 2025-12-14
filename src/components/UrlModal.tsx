import { useEffect, useRef, useState } from 'react';

type UrlModalProps = {
  open: boolean;
  defaultValue?: string;
  title?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (url: string) => void;
  onClose: () => void;
};

export function UrlModal({
  open,
  defaultValue,
  title = 'Add element',
  placeholder = 'https://urltovideo.com',
  submitLabel = 'Add',
  onSubmit,
  onClose,
}: UrlModalProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? '');
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, value]);

  const handleSubmit = () => {
    const url = value.trim();
    if (!url) return;
    onSubmit(url);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      className="modal-backdrop"
    >
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="icon-button">
            ×
          </button>
        </div>
        <div className="modal-row">
          <input
            ref={inputRef}
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="url-input"
          />
          <button
            onClick={handleSubmit}
            className="btn"
            aria-label={submitLabel}
            title={submitLabel}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UrlModal;
