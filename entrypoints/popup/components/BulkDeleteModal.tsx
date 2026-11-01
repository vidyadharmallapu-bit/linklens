import { Icon } from './Icon';

type BulkDeleteModalProps = {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BulkDeleteModal({ count, onConfirm, onCancel }: BulkDeleteModalProps) {
  return (
    <div className="preview-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="popover-card confirm-delete-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="confirm-delete-header">
          <div className="confirm-delete-icon">
            <Icon name="trash" size={18} />
          </div>
          <div className="confirm-delete-text">
            <h3 id="confirm-delete-title" className="confirm-delete-title">
              Delete {count} {count === 1 ? 'image' : 'images'}?
            </h3>
            <p className="confirm-delete-desc">
              This will permanently remove the selected {count === 1 ? 'image' : 'images'} from your local IndexedDB database. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="confirm-delete-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-confirm-btn"
            onClick={onConfirm}
          >
            <Icon name="trash" size={14} />
            <span>Delete {count} {count === 1 ? 'Image' : 'Images'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
