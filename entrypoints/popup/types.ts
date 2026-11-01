export type StoredImageRecord = {
  id: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  /** Stores the most-recently generated signed URL (not a permanent public URL). */
  publicUrl?: string;
  /** Unix ms timestamp when the signed URL expires. */
  signedUrlExpiresAt?: number;
  storagePath?: string;
  userId?: string;
};

export type GalleryImage = {
  id: string;
  name: string;
  size: number;
  createdAt: number;
  url: string; // Active session URL (Object URL or blob URL)
  source: 'upload' | 'example';
  width?: number;
  height?: number;
  mimeType?: string;
  fileKey?: string;
  blob?: Blob;
  /** The most-recently generated Supabase signed URL for this image. */
  publicUrl?: string;
  /** Unix ms timestamp when publicUrl (signed URL) expires. */
  signedUrlExpiresAt?: number;
  storagePath?: string;
  userId?: string;
};

export type ValidationFailure = {
  filename: string;
  reason: string;
};

export type UploadProcessingResult = {
  accepted: GalleryImage[];
  rejected: ValidationFailure[];
  duplicateCount: number;
};

export type StorageStats = {
  imageCount: number;
  bytesUsed: number;
  quotaBytes: number | null;
  browserUsageBytes: number | null;
};

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc';

export type FormatFilter = 'all' | 'jpeg' | 'png' | 'webp' | 'gif';

export type ViewMode = 'grid' | 'list';

export type UserPreferences = {
  sortOrder: SortOption;
  viewMode: ViewMode;
  formatFilter: FormatFilter;
};

export type ShareFormat = 'url' | 'markdown' | 'html' | 'ai-prompt';

/** Signed URL expiry options in seconds: 1 h, 24 h, 7 d, 30 d. */
export type SignedUrlExpiry = 3600 | 86400 | 604800 | 2592000;

/**
 * Describes the cloud-sharing state of an image:
 * - local-only: not uploaded to Supabase Storage
 * - cloud-private: uploaded but no signed URL generated
 * - shared-active: signed URL exists and has not expired
 * - shared-expired: signed URL existed but has expired
 */
export type ShareStatus = 'local-only' | 'cloud-private' | 'shared-active' | 'shared-expired';

export type AuthUser = {
  id: string;
  email: string;
  createdAt?: string;
};
