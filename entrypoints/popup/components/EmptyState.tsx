import { Icon } from './Icon';

type EmptyStateProps = {
  onUpload: () => void;
  onShowExamples: () => void;
};

export function EmptyState({ onUpload, onShowExamples }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-illustration" aria-hidden="true">
        <div className="empty-card empty-card-back" />
        <div className="empty-card empty-card-front">
          <Icon name="image" size={26} />
        </div>
        <span className="empty-sparkle empty-sparkle-1" />
        <span className="empty-sparkle empty-sparkle-2" />
      </div>

      <h3 className="empty-state-title">Your gallery is waiting.</h3>
      <p className="empty-state-text">
        Upload images to generate instant preview links, organize your visual assets, and streamline your workflow.
      </p>

      <div className="empty-state-actions">
        <button
          className="primary-button"
          type="button"
          onClick={onUpload}
        >
          <Icon name="arrowUp" size={15} />
          <span>Upload your first image</span>
        </button>

        <button
          className="secondary-text-button"
          type="button"
          onClick={onShowExamples}
        >
          Explore sample preview images
        </button>
      </div>
    </div>
  );
}
