import { Icon } from './Icon';

type HeaderProps = {
  profileOpen: boolean;
  settingsOpen: boolean;
  userEmail?: string;
  isCloudActive?: boolean;
  onToggleProfile: () => void;
  onToggleSettings: () => void;
};

export function Header({
  profileOpen,
  settingsOpen,
  userEmail,
  isCloudActive = false,
  onToggleProfile,
  onToggleSettings,
}: HeaderProps) {
  return (
    <header className="header-bar" role="banner">
      <div className="brand-group">
        <div className="brand-mark">
          <Icon name="brand" size={26} />
        </div>
        <div className="brand-text">
          <span className="brand-title">LinkLens</span>
          <span className="brand-badge">AI Ready</span>
        </div>
      </div>

      <div className="header-controls">
        <button
          type="button"
          className={`control-button ${profileOpen ? 'is-active' : ''} ${isCloudActive ? 'is-authenticated' : ''}`}
          onClick={onToggleProfile}
          aria-label={userEmail ? `Signed in as ${userEmail}` : 'Account & Cloud Sync'}
          aria-expanded={profileOpen}
          title={userEmail ? `Signed in as ${userEmail}` : 'Sign in for Cloud HTTPS links'}
        >
          <Icon name="user" size={16} />
          {isCloudActive && <span className="auth-indicator-dot" />}
        </button>

        <button
          type="button"
          className={`control-button ${settingsOpen ? 'is-active' : ''}`}
          onClick={onToggleSettings}
          aria-label="Settings"
          aria-expanded={settingsOpen}
          title="Extension Settings"
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
    </header>
  );
}
