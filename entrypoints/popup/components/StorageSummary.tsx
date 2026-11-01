import { Icon } from './Icon';

type StorageSummaryProps = {
  imageCount: number;
  bytesUsed: number;
  quotaBytes?: number | null;
  browserUsageBytes?: number | null;
  isDbReady?: boolean;
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageSummary({
  imageCount,
  bytesUsed,
  quotaBytes,
  isDbReady = true,
}: StorageSummaryProps) {
  // Only compute a percentage if browser provided a real non-zero quota
  const hasValidQuota = typeof quotaBytes === 'number' && quotaBytes > 0;
  const quotaPercentage = hasValidQuota ? Math.min((bytesUsed / quotaBytes) * 100, 100) : null;

  return (
    <section className="storage-card" aria-label="Storage summary">
      <div className="storage-card-header">
        <div className="storage-label-group">
          <span className="storage-icon">
            <Icon name="image" size={15} />
          </span>
          <span className="storage-label">Local Persistent Storage</span>
        </div>
        <span className={`storage-status-pill ${isDbReady ? 'is-persistent' : ''}`}>
          {isDbReady ? 'IndexedDB Active' : 'Connecting...'}
        </span>
      </div>

      <div className="storage-stats-grid">
        <div className="storage-stat">
          <span className="stat-number">{imageCount}</span>
          <span className="stat-label">{imageCount === 1 ? 'image stored' : 'images stored'}</span>
        </div>
        <div className="stat-divider" aria-hidden="true" />
        <div className="storage-stat">
          <span className="stat-number">{formatFileSize(bytesUsed)}</span>
          <span className="stat-label">storage used</span>
        </div>
        <div className="stat-divider" aria-hidden="true" />
        <div className="storage-stat">
          <span className="stat-number-secondary">10 MB</span>
          <span className="stat-label">max / upload</span>
        </div>
      </div>

      {hasValidQuota ? (
        <div className="storage-progress-container">
          <div
            className="storage-progress-track"
            role="progressbar"
            aria-valuenow={Math.round(quotaPercentage ?? 0)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Browser storage quota usage"
          >
            <div
              className="storage-progress-fill"
              style={{
                width: `${Math.max(quotaPercentage ?? 0, imageCount > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
          <div className="storage-progress-meta">
            <span>
              LinkLens: {formatFileSize(bytesUsed)} (
              {(quotaPercentage ?? 0) < 0.01 ? '<0.01%' : `${(quotaPercentage ?? 0).toFixed(2)}%`} of browser quota)
            </span>
            <span>Est. Quota: {formatFileSize(quotaBytes)}</span>
          </div>
        </div>
      ) : (
        <div className="storage-info-caption">
          <span>Persisted locally in IndexedDB • Maximum individual upload size: 10 MB</span>
        </div>
      )}
    </section>
  );
}
