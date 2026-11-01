import { useState } from 'react';
import { Icon } from './Icon';
import { formatShareableLink, markImageAsPublic } from '../services/supabase';
import type { GalleryImage, ShareFormat } from '../types';

type ShareModalProps = {
  image: GalleryImage;
  onClose: () => void;
  onUploadToCloud?: (image: GalleryImage) => Promise<void>;
};

export function ShareModal({ image, onClose, onUploadToCloud }: ShareModalProps) {
  const [format, setFormat] = useState<ShareFormat>('url');
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const hasPublicLink = Boolean(image.publicUrl);
  const displayUrl = image.publicUrl || '';
  const formattedContent = hasPublicLink
    ? formatShareableLink(displayUrl, image.name, format)
    : '';

  async function handleCopy() {
    if (!hasPublicLink) return;

    // When the user copies for the first time, mark image as public in the DB
    if (image.id && !image.id.startsWith('example-')) {
      markImageAsPublic(image.id).catch(() => {/* non-fatal */});
    }

    try {
      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard permission may be denied in some contexts
    }
  }

  async function handleSyncClick() {
    if (!onUploadToCloud) return;
    setSyncing(true);
    try {
      await onUploadToCloud(image);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="preview-backdrop" role="presentation" onClick={onClose}>
      <div
        className="popover-card share-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="popover-header">
          <div className="share-icon-wrap">
            <Icon name="copy" size={17} />
          </div>
          <div className="user-info">
            <strong id="share-modal-title" className="user-name">Shareable Image Link</strong>
            <span className="user-tier">AI Platform &amp; Cloud Sharing</span>
          </div>
          <button
            type="button"
            className="popover-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="popover-body">
          {/* Status Indicator */}
          <div className="share-status-row">
            <div className="image-mini-preview">
              <img src={image.url} alt="" />
            </div>
            <div className="share-status-details">
              <span className="share-filename" title={image.name}>{image.name}</span>
              {hasPublicLink ? (
                <span className="share-badge-public">
                  <span className="status-indicator-dot" /> Cloud Synced • Public HTTPS
                </span>
              ) : (
                <span className="share-badge-local">
                  <span className="status-dot-amber" /> Local Only — Not yet shared
                </span>
              )}
            </div>
          </div>

          {/* If image is local only, offer cloud upload */}
          {!hasPublicLink ? (
            <div className="cloud-sync-prompt">
              <p className="cloud-sync-desc">
                This image is stored locally in IndexedDB. Local preview URLs (<code>blob:</code>) cannot be accessed by external AI services like ChatGPT, Gemini, or Claude.
              </p>
              {onUploadToCloud && (
                <button
                  type="button"
                  className="primary-button sync-btn"
                  onClick={handleSyncClick}
                  disabled={syncing}
                >
                  {syncing ? (
                    <>
                      <span className="spinner-icon" />
                      <span>Uploading to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="arrowUp" size={14} />
                      <span>Generate Public HTTPS Link</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Share Formats and Copy */
            <div className="share-content-area">
              <div className="format-selector-row">
                <label className="format-label">LINK FORMAT</label>
                <div className="format-pills">
                  <button
                    type="button"
                    className={`format-btn ${format === 'url' ? 'is-active' : ''}`}
                    onClick={() => setFormat('url')}
                  >
                    Direct URL
                  </button>
                  <button
                    type="button"
                    className={`format-btn ${format === 'markdown' ? 'is-active' : ''}`}
                    onClick={() => setFormat('markdown')}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    className={`format-btn ${format === 'html' ? 'is-active' : ''}`}
                    onClick={() => setFormat('html')}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    className={`format-btn ${format === 'ai-prompt' ? 'is-active' : ''}`}
                    onClick={() => setFormat('ai-prompt')}
                  >
                    AI Prompt
                  </button>
                </div>
              </div>

              <div className="link-output-box">
                <textarea
                  readOnly
                  className="link-textarea"
                  value={formattedContent}
                  rows={2}
                  aria-label="Formatted shareable link"
                />
                <button
                  type="button"
                  className={`primary-button copy-link-btn ${copied ? 'is-copied' : ''}`}
                  onClick={handleCopy}
                >
                  <Icon name={copied ? 'check' : 'copy'} size={14} />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* AI Platform Compatibility Section */}
              <div className="ai-compat-box">
                <span className="ai-compat-title">AI PLATFORM COMPATIBILITY</span>
                <div className="ai-compat-list">
                  <div className="ai-compat-row">
                    <span className="ai-platform-name">ChatGPT (GPT-4o)</span>
                    <span className="ai-support-pill pill-full">Fully Supported</span>
                  </div>
                  <div className="ai-compat-row">
                    <span className="ai-platform-name">Google Gemini</span>
                    <span className="ai-support-pill pill-full">Fully Supported</span>
                  </div>
                  <div className="ai-compat-row">
                    <span className="ai-platform-name">Claude 3.5 Sonnet</span>
                    <span className="ai-support-pill pill-full">Fully Supported</span>
                  </div>
                </div>
                <span className="ai-compat-note">
                  Direct HTTPS CDN URLs are publicly accessible worldwide.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
