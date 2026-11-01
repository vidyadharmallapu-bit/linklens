import { Icon } from './Icon';

type SettingsModalProps = {
  onClose: () => void;
  onClearSession: () => void;
};

export function SettingsModal({ onClose, onClearSession }: SettingsModalProps) {
  return (
    <div className="panel-overlay" onClick={onClose} role="presentation">
      <div
        className="popover-card settings-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="popover-header">
          <div className="settings-header-icon">
            <Icon name="settings" size={17} />
          </div>
          <div className="user-info">
            <strong className="user-name">LinkLens Preferences</strong>
            <span className="user-tier">v0.2.0 • Chrome MV3</span>
          </div>
          <button
            type="button"
            className="popover-close-btn"
            onClick={onClose}
            aria-label="Close Settings"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="popover-body">
          <div className="settings-group">
            <label className="settings-label">STORAGE MANAGEMENT</label>
            <div className="settings-action-row">
              <div>
                <span className="settings-item-title">Clear Local Gallery</span>
                <p className="settings-item-desc">
                  Delete all stored images from IndexedDB and revoke preview links.
                </p>
              </div>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  onClearSession();
                  onClose();
                }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label">WORKFLOW HINTS</label>
            <div className="shortcut-row">
              <span className="shortcut-name">Close Previews</span>
              <kbd className="shortcut-key">ESC</kbd>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-name">Open File Picker</span>
              <kbd className="shortcut-key">Click Upload</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
