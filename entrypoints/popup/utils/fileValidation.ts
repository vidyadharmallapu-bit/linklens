import type { GalleryImage, ValidationFailure, UploadProcessingResult } from '../types';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const SUPPORTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const SUPPORTED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
]);

/**
 * Generates a stable duplicate-check key for a File.
 */
export function getFileKey(file: File): string {
  return `${file.name.toLowerCase().trim()}-${file.size}-${file.lastModified}`;
}

/**
 * Validates file headers, extension, size, and non-emptiness before decoding.
 */
export function validateFileMetadata(file: File): { valid: boolean; error?: string } {
  // Check empty file
  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  // Check file size (10 MB max)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Exceeds 10 MB limit (${sizeMb} MB).`,
    };
  }

  // Check extension and MIME type
  const extension = file.name.split('.').pop()?.toLowerCase();
  const hasValidExtension = extension !== undefined && SUPPORTED_EXTENSIONS.has(extension);
  const hasValidMime = file.type ? SUPPORTED_MIME_TYPES.has(file.type) : false;

  // We require either a valid MIME type or a valid extension (for files with missing MIME in some OS contexts)
  if (!hasValidExtension && !hasValidMime) {
    return {
      valid: false,
      error: 'Unsupported format. Please select JPG, PNG, WebP, or GIF.',
    };
  }

  return { valid: true };
}

/**
 * Validates that an image file is readable/decodable by the browser
 * and extracts its natural dimensions.
 */
export function decodeImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('Image has zero dimensions or could not be rendered.'));
      } else {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => {
      reject(new Error('Corrupted or unreadable image file.'));
    };
    img.src = url;
  });
}

/**
 * Processes a list of files with full validation, duplicate checking,
 * dimension extraction, and object URL creation.
 */
export async function processFilesForUpload(
  files: File[],
  existingImages: GalleryImage[]
): Promise<UploadProcessingResult> {
  const accepted: GalleryImage[] = [];
  const rejected: ValidationFailure[] = [];
  let duplicateCount = 0;

  // Track existing keys in session
  const existingKeys = new Set(
    existingImages.map((img) => img.fileKey ?? `${img.name.toLowerCase().trim()}-${img.size}`)
  );

  // Track keys within current selection batch to prevent duplicate selections
  const currentBatchKeys = new Set<string>();

  for (const file of files) {
    const fileKey = getFileKey(file);
    const fallbackKey = `${file.name.toLowerCase().trim()}-${file.size}`;

    // 1. Duplicate check within selection or existing session
    if (
      existingKeys.has(fileKey) ||
      existingKeys.has(fallbackKey) ||
      currentBatchKeys.has(fileKey) ||
      currentBatchKeys.has(fallbackKey)
    ) {
      duplicateCount++;
      rejected.push({
        filename: file.name,
        reason: 'Duplicate file already exists in session or batch.',
      });
      continue;
    }

    currentBatchKeys.add(fileKey);

    // 2. Metadata check (type, size, empty)
    const metaCheck = validateFileMetadata(file);
    if (!metaCheck.valid) {
      rejected.push({
        filename: file.name,
        reason: metaCheck.error ?? 'Validation failed.',
      });
      continue;
    }

    // 3. Decoding and readability check
    const objectUrl = URL.createObjectURL(file);
    try {
      const dimensions = await decodeImageDimensions(objectUrl);
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        createdAt: Date.now(),
        url: objectUrl,
        source: 'upload',
        width: dimensions.width,
        height: dimensions.height,
        mimeType: file.type || `image/${file.name.split('.').pop()?.toLowerCase()}`,
        fileKey,
        blob: file,
      });
    } catch (error) {
      // Immediate cleanup of unreadable/corrupted object URL to prevent memory leak
      URL.revokeObjectURL(objectUrl);
      const message = error instanceof Error ? error.message : 'Corrupted or unreadable image.';
      rejected.push({
        filename: file.name,
        reason: message,
      });
    }
  }

  return { accepted, rejected, duplicateCount };
}
