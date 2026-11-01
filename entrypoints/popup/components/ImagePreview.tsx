import { useEffect, useState, useCallback } from 'react';
import { Icon } from './Icon';
import { formatFileSize } from './StorageSummary';
import type { GalleryImage } from '../types';

type ImagePreviewProps = {
  image: GalleryImage;
  images?: GalleryImage[];
  currentIndex?: number;
  onClose: () => void;
  onCopy?: (image: GalleryImage) => void;
  onNavigate?: (newIndex: number) => void;
};

export function ImagePreview({
  image,
  images = [],
  currentIndex = -1,
  onClose,
  onCopy,
  onNavigate,
}: ImagePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  const totalImages = images.length;
  const hasMultiple = totalImages > 1 && currentIndex >= 0;

  const handlePrevious = useCallback(() => {
    if (!onNavigate || !hasMultiple) return;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : totalImages - 1;
    onNavigate(prevIndex);
  }, [currentIndex, hasMultiple, onNavigate, totalImages]);

  const handleNext = useCallback(() => {
    if (!onNavigate || !hasMultiple) return;
    const nextIndex = currentIndex < totalImages - 1 ? currentIndex + 1 : 0;
    onNavigate(nextIndex);
  }, [currentIndex, hasMultiple, onNavigate, totalImages]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, onClose]);

  // Reset error state if image changes
  useEffect(() => {
    setHasError(false);
  }, [image.id]);

  function handleCopy() {
    if (onCopy) {
      onCopy(image);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const dimensionString =
    image.width && image.height ? `${image.width} × ${image.height} px` : null;

  const formattedDate = new Date(image.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatBadge = (image.mimeType || image.name.split('.').pop() || 'IMG')
    .replace('image/', '')
    .toUpperCase();

  return (
    <div
      className="preview-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        <div className="preview-modal-header">
          <div className="preview-meta">
            <div className="preview-top-tags">
              <span className="preview-tag">
                {image.source === 'example' ? 'SAMPLE PREVIEW' : 'LOCAL IMAGE'}
              </span>
              {hasMultiple && (
                <span className="preview-counter-tag">
                  {currentIndex + 1} of {totalImages}
                </span>
              )}
            </div>
            <h3 id="preview-modal-title" className="preview-title" title={image.name}>
              {image.name}
            </h3>
            <div className="preview-metadata-line">
              <span className="preview-mimetype">{formatBadge}</span>
              <span className="meta-bullet" aria-hidden="true">•</span>
              <span>{formatFileSize(image.size)}</span>
              {dimensionString && (
                <>
                  <span className="meta-bullet" aria-hidden="true">•</span>
                  <span>{dimensionString}</span>
                </>
              )}
              <span className="meta-bullet" aria-hidden="true">•</span>
              <span className="preview-date">{formattedDate}</span>
            </div>
          </div>

          <div className="preview-header-actions">
            {onCopy && (
              <button
                type="button"
                className={`preview-action-btn ${copied ? 'is-copied' : ''}`}
                onClick={handleCopy}
                aria-label="Copy image URL"
                title="Copy local preview URL"
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            )}

            <button
              type="button"
              className="preview-close-button"
              onClick={onClose}
              aria-label="Close image preview"
              title="Close (Esc)"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        <div className="preview-stage-container">
          {hasMultiple && (
            <button
              type="button"
              className="preview-nav-btn prev-btn"
              onClick={handlePrevious}
              aria-label="Previous image (Left Arrow)"
              title="Previous image"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
          )}

          <div className="preview-stage">
            {hasError ? (
              <div className="preview-error-state">
                <Icon name="image" size={32} />
                <p className="preview-error-title">Image could not be rendered</p>
                <p className="preview-error-desc">
                  The image file format or data may be unreadable by the browser.
                </p>
              </div>
            ) : (
              <img
                src={image.url}
                alt={image.name}
                className="preview-full-image"
                onError={() => setHasError(true)}
              />
            )}
          </div>

          {hasMultiple && (
            <button
              type="button"
              className="preview-nav-btn next-btn"
              onClick={handleNext}
              aria-label="Next image (Right Arrow)"
              title="Next image"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
