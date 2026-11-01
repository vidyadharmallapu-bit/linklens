import { useState } from 'react';
import { Icon } from './Icon';
import { formatFileSize } from './StorageSummary';
import type { FormatFilter, GalleryImage, SortOption, ViewMode } from '../types';

type ImageGalleryProps = {
  images: GalleryImage[];
  totalCount: number;
  isShowingExamples: boolean;
  onHideExamples: () => void;
  query: string;
  sortOrder: SortOption;
  viewMode: ViewMode;
  formatFilter: FormatFilter;
  selectedIds: Set<string>;
  onQueryChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onViewChange: (value: ViewMode) => void;
  onFilterChange: (value: FormatFilter) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRequestBulkDelete: () => void;
  onPreview: (image: GalleryImage) => void;
  onCopy: (image: GalleryImage) => void;
  onDelete: (image: GalleryImage) => void;
  onShare?: (image: GalleryImage) => void;
};

const FORMAT_OPTIONS: Array<{ key: FormatFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'jpeg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
  { key: 'webp', label: 'WebP' },
  { key: 'gif', label: 'GIF' },
];

export function ImageGallery({
  images,
  totalCount,
  isShowingExamples,
  onHideExamples,
  query,
  sortOrder,
  viewMode,
  formatFilter,
  selectedIds,
  onQueryChange,
  onSortChange,
  onViewChange,
  onFilterChange,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onRequestBulkDelete,
  onPreview,
  onCopy,
  onDelete,
  onShare,
}: ImageGalleryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const hasSelections = selectedIds.size > 0;
  const allSelected = images.length > 0 && selectedIds.size === images.length;

  function handleCopyClick(image: GalleryImage) {
    onCopy(image);
    setCopiedId(image.id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === image.id ? null : curr));
    }, 2000);
  }

  function handleImageError(id: string) {
    setFailedImageIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function formatDimensions(width?: number, height?: number): string {
    if (!width || !height) return '';
    return `${width} × ${height}`;
  }

  function getFormatBadge(image: GalleryImage): string {
    const raw = image.mimeType || image.name.split('.').pop() || 'IMG';
    return raw.replace('image/', '').toUpperCase();
  }

  return (
    <section className="gallery-section" aria-labelledby="gallery-title">
      {/* Header Row */}
      <div className="gallery-header-row">
        <div className="gallery-title-group">
          <h2 id="gallery-title" className="gallery-heading">Image Gallery</h2>
          <span className="gallery-counter-pill" title="Visible / Total images">
            {images.length}
            {images.length !== totalCount && ` of ${totalCount}`}
          </span>
        </div>

        {isShowingExamples && (
          <button
            type="button"
            className="sample-dismiss-chip"
            onClick={onHideExamples}
            title="Dismiss sample images"
          >
            <span>Sample Mode</span>
            <Icon name="close" size={12} />
          </button>
        )}
      </div>

      {/* Main Search & Sort Toolbar */}
      <div className="gallery-controls">
        <div className="search-input-wrapper">
          <Icon name="search" size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by filename..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Search by filename"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
            >
              <Icon name="close" size={13} />
            </button>
          )}
        </div>

        <div className="filter-controls-group">
          <div className="sort-dropdown-wrap">
            <Icon name="clock" size={13} className="sort-icon" />
            <select
              className="sort-dropdown"
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Sort images"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Filename A–Z</option>
              <option value="name-desc">Filename Z–A</option>
              <option value="size-desc">Largest first</option>
              <option value="size-asc">Smallest first</option>
            </select>
          </div>

          <div className="view-mode-toggle" role="group" aria-label="Grid or list view toggle">
            <button
              type="button"
              className={`toggle-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => onViewChange('grid')}
              aria-label="Grid view"
              title="Grid view"
            >
              <Icon name="grid" size={14} />
            </button>
            <button
              type="button"
              className={`toggle-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
              onClick={() => onViewChange('list')}
              aria-label="List view"
              title="List view"
            >
              <Icon name="list" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Format Filter Bar */}
      <div className="format-filter-bar" role="toolbar" aria-label="Filter by image format">
        <span className="filter-bar-label">
          <Icon name="filter" size={12} />
          <span>Format:</span>
        </span>
        <div className="filter-pills-list">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`filter-pill-btn ${formatFilter === opt.key ? 'is-active' : ''}`}
              onClick={() => onFilterChange(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Selection Actions Bar */}
      {images.length > 0 && (
        <div className={`bulk-action-bar ${hasSelections ? 'has-selections' : ''}`}>
          <div className="bulk-select-group">
            <label className="checkbox-label" title={allSelected ? 'Deselect all' : 'Select all'}>
              <input
                type="checkbox"
                className="gallery-checkbox"
                checked={allSelected}
                onChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
                aria-label="Select all images"
              />
              <span className="bulk-select-text">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </label>

            {hasSelections && (
              <span className="selected-counter-tag">
                {selectedIds.size} of {images.length} selected
              </span>
            )}
          </div>

          {hasSelections && (
            <button
              type="button"
              className="bulk-delete-btn"
              onClick={onRequestBulkDelete}
              aria-label={`Delete ${selectedIds.size} selected images`}
            >
              <Icon name="trash" size={13} />
              <span>Delete ({selectedIds.size})</span>
            </button>
          )}
        </div>
      )}

      {/* Image Grid or List View */}
      {images.length > 0 ? (
        <div className={`gallery-container view-${viewMode}`}>
          {images.map((image) => {
            const hasFailed = failedImageIds.has(image.id);
            const dimText = formatDimensions(image.width, image.height);
            const isSelected = selectedIds.has(image.id);
            const formatBadge = getFormatBadge(image);

            return (
              <article
                key={image.id}
                className={`image-card ${viewMode === 'list' ? 'card-list' : 'card-grid'} ${
                  isSelected ? 'is-card-selected' : ''
                }`}
              >
                {/* Checkbox overlay for bulk selection */}
                <div
                  className="card-checkbox-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="gallery-checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(image.id)}
                    aria-label={`Select ${image.name}`}
                  />
                </div>

                {/* Thumbnail */}
                <div
                  className="thumbnail-wrapper"
                  role="button"
                  tabIndex={0}
                  onClick={() => onPreview(image)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPreview(image);
                    }
                  }}
                  aria-label={`Preview ${image.name}`}
                >
                  {hasFailed ? (
                    <div className="thumbnail-fallback" title="Preview failed to load">
                      <Icon name="image" size={20} />
                      <span className="fallback-text">Unreadable</span>
                    </div>
                  ) : (
                    <img
                      src={image.url}
                      alt={image.name}
                      className="thumbnail-image"
                      loading="lazy"
                      onError={() => handleImageError(image.id)}
                    />
                  )}

                  {image.source === 'example' ? (
                    <span className="sample-badge">Sample</span>
                  ) : image.publicUrl ? (
                    <span className="cloud-badge" title="Public HTTPS link active">HTTPS</span>
                  ) : null}
                  <div className="preview-hover-tag">
                    <span>Details</span>
                  </div>
                </div>

                {/* Grid View Details */}
                {viewMode === 'grid' ? (
                  <div className="card-details">
                    <div className="card-text">
                      <span className="file-name" title={image.name}>
                        {image.name}
                      </span>
                      <div className="file-meta-row">
                        <span className="file-size">{formatFileSize(image.size)}</span>
                        {dimText && (
                          <>
                            <span className="meta-bullet" aria-hidden="true">•</span>
                            <span className="file-dimensions">{dimText}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className={`card-action-btn ${copiedId === image.id ? 'is-copied' : ''}`}
                        onClick={() => (onShare ? onShare(image) : handleCopyClick(image))}
                        aria-label={`Share link for ${image.name}`}
                        title={
                          image.source === 'example'
                            ? 'Sample images do not have URLs'
                            : image.publicUrl
                            ? 'Copy public HTTPS link & AI formats'
                            : 'Copy preview link / Upload to cloud'
                        }
                      >
                        <Icon name={copiedId === image.id ? 'check' : 'copy'} size={14} />
                      </button>

                      <button
                        type="button"
                        className="card-action-btn delete-btn"
                        onClick={() => onDelete(image)}
                        aria-label={`Delete ${image.name}`}
                        title="Delete image"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* List View Detailed Row */
                  <div className="card-details-list">
                    <div className="list-primary-info">
                      <span className="file-name list-file-name" title={image.name}>
                        {image.name}
                      </span>
                      <div className="list-meta-subrow">
                        <span className="format-badge-pill">{formatBadge}</span>
                        {dimText && (
                          <>
                            <span className="meta-bullet" aria-hidden="true">•</span>
                            <span className="list-dim-text">{dimText}</span>
                          </>
                        )}
                        <span className="meta-bullet" aria-hidden="true">•</span>
                        <span className="list-date-text">
                          {new Date(image.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="list-trailing-actions">
                      <span className="list-size-text">{formatFileSize(image.size)}</span>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="card-action-btn"
                          onClick={() => onPreview(image)}
                          aria-label={`View details for ${image.name}`}
                          title="View image details"
                        >
                          <Icon name="info" size={14} />
                        </button>

                        <button
                          type="button"
                          className={`card-action-btn ${copiedId === image.id ? 'is-copied' : ''}`}
                          onClick={() => (onShare ? onShare(image) : handleCopyClick(image))}
                          aria-label={`Share link for ${image.name}`}
                          title={
                            image.source === 'example'
                              ? 'Sample images do not have URLs'
                              : image.publicUrl
                              ? 'Copy public HTTPS link & AI formats'
                              : 'Copy preview link / Upload to cloud'
                          }
                        >
                          <Icon name={copiedId === image.id ? 'check' : 'copy'} size={14} />
                        </button>

                        <button
                          type="button"
                          className="card-action-btn delete-btn"
                          onClick={() => onDelete(image)}
                          aria-label={`Delete ${image.name}`}
                          title="Delete image"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="no-matches-box" role="status">
          <Icon name="search" size={20} />
          <p className="no-matches-text">
            {query.trim().length > 0
              ? `No images match “${query}”.`
              : `No ${formatFilter.toUpperCase()} images in your gallery.`}
          </p>
          <button
            type="button"
            className="clear-filter-btn"
            onClick={() => {
              onQueryChange('');
              onFilterChange('all');
            }}
          >
            Reset search and filters
          </button>
        </div>
      )}
    </section>
  );
}
