import { Icon } from './Icon';

type FooterProps = {
  imageCount: number;
  onOpenSettings: () => void;
};

export function Footer({ imageCount, onOpenSettings }: FooterProps) {
  return (
    <footer className="extension-footer" role="contentinfo">
      <div className="footer-left">
        <span className="footer-logo">
          <Icon name="brand" size={15} />
        </span>
        <span className="footer-title">LinkLens</span>
        <span className="footer-status-pill">
          <span className="status-indicator-dot" />
          {imageCount} {imageCount === 1 ? 'asset' : 'assets'} persisted locally
        </span>
      </div>

      <div className="footer-right">
        <button
          type="button"
          className="footer-link-btn"
          onClick={onOpenSettings}
        >
          <Icon name="settings" size={13} />
          <span>Settings</span>
        </button>
      </div>
    </footer>
  );
}
