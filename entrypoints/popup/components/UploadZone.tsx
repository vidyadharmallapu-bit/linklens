import { useState, type DragEvent, type RefObject } from 'react';
import { Icon } from './Icon';

type UploadZoneProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
  onOpenPicker: () => void;
  isProcessing?: boolean;
};

export function UploadZone({
  inputRef,
  onFiles,
  onOpenPicker,
  isProcessing = false,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!isProcessing && !isDragging) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFiles(Array.from(event.dataTransfer.files));
    }
  }

  function handleClick() {
    if (!isProcessing) {
      onOpenPicker();
    }
  }

  return (
    <section className="upload-section" aria-label="Upload images">
      <div
        className={`drop-zone ${isDragging ? 'is-dragging' : ''} ${isProcessing ? 'is-processing' : ''}`}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-disabled={isProcessing}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
          }
        }}
        aria-label="Upload area: Drop your images here or click to browse files"
      >
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
          multiple
          disabled={isProcessing}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              onFiles(files);
            }
            // Reset input value so same files selected later or re-selected can trigger onChange
            event.target.value = '';
          }}
          tabIndex={-1}
          aria-label="Choose image files"
        />

        <div className="upload-content">
          <div className="upload-icon-badge">
            {isProcessing ? (
              <span className="spinner-icon" aria-hidden="true" />
            ) : (
              <Icon name="upload" size={20} />
            )}
          </div>

          <div className="upload-text-block">
            <p className="upload-title">
              {isProcessing ? 'Validating and processing...' : 'Drop your images here'}
            </p>
            <p className="upload-subtitle">
              {isProcessing
                ? 'Inspecting dimensions and file integrity'
                : 'or click to choose files from your device'}
            </p>
          </div>

          <button
            type="button"
            className="browse-button"
            disabled={isProcessing}
            onClick={(event) => {
              event.stopPropagation();
              onOpenPicker();
            }}
          >
            {isProcessing ? 'Processing...' : 'Browse files'}
          </button>

          <span className="upload-formats">Supported: JPG, JPEG, PNG, WebP, GIF • Max 10 MB each</span>
        </div>
      </div>
    </section>
  );
}
