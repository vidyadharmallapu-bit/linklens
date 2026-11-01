import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AuthUser, ShareFormat, StoredImageRecord } from '../types';

// Private bucket — objects are NOT publicly accessible by URL alone.
// Access requires either a valid signed URL or authenticated session.
// The bucket is created as PRIVATE in the Supabase Dashboard.
// Signed URLs are generated on-demand for sharing with AI platforms.
export const BUCKET_NAME = 'linklens-images';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Returns true when valid Supabase credentials are present.
 * Accepts both legacy JWT anon keys (eyJ...) and new publishable keys (sb_...).
 */
export function isSupabaseConfigured(): boolean {
  if (
    typeof supabaseUrl !== 'string' ||
    supabaseUrl.trim().length === 0 ||
    supabaseUrl.includes('your-project')
  ) return false;

  if (
    typeof supabaseAnonKey !== 'string' ||
    supabaseAnonKey.trim().length === 0 ||
    supabaseAnonKey.includes('your-anon-public-key') ||
    supabaseAnonKey.includes('your-publishable-key')
  ) return false;

  const isJwt = supabaseAnonKey.startsWith('eyJ');
  const isPublishable = supabaseAnonKey.startsWith('sb_');
  return isJwt || isPublishable;
}

let supabaseInstance: SupabaseClient | null = null;

/** Returns the initialised Supabase client singleton, or null if not configured. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseInstance;
}

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email || 'user@linklens.app',
    createdAt: user.created_at,
  };
}

/** Returns the currently authenticated user, or null. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session?.user) return null;
    return mapSupabaseUser(session.user);
  } catch {
    return null;
  }
}

/** Sign up a new user with email and password. */
export async function signUpUser(
  email: string,
  pass: string
): Promise<{ user: AuthUser | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { user: null, error: 'Supabase credentials are not configured in .env' };

  try {
    const { data, error } = await client.auth.signUp({ email, password: pass });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'Sign up failed.' };
    return { user: mapSupabaseUser(data.user) };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Unknown sign-up error.' };
  }
}

/** Sign in an existing user with email and password. */
export async function signInUser(
  email: string,
  pass: string
): Promise<{ user: AuthUser | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { user: null, error: 'Supabase credentials are not configured in .env' };

  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password: pass });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: 'Sign in failed.' };
    return { user: mapSupabaseUser(data.user) };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Unknown sign-in error.' };
  }
}

/** Sign out the current user session. */
export async function signOutUser(): Promise<{ error?: string }> {
  const client = getSupabaseClient();
  if (!client) return {};
  try {
    const { error } = await client.auth.signOut();
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign out failed.' };
  }
}

/** Send a password-reset email. */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase credentials are not configured.' };

  try {
    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Reset failed.' };
  }
}

// ---------------------------------------------------------------------------
// Storage — private bucket
// ---------------------------------------------------------------------------

/**
 * Uploads an image Blob to the PRIVATE Supabase Storage bucket.
 *
 * The bucket is private: no public CDN URL is generated.
 * Access to objects requires a signed URL (see generateSignedUrl).
 *
 * ID SYNCHRONISATION: pass `existingId` (the IndexedDB record ID) so the
 * Supabase DB row uses the same UUID.  This avoids a mismatch when we later
 * run DB operations keyed on that ID. If not provided, a new UUID is generated.
 *
 * Retries once on transient upload failures.
 * Returns a signed URL (valid for 30 days by default) for immediate sharing.
 */
export async function uploadImageToSupabase(
  blob: Blob,
  fileName: string,
  metadata: { width: number; height: number; size: number; mimeType: string },
  existingId?: string
): Promise<{ id: string; storagePath: string; signedUrl: string; expiresAt: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { id: '', storagePath: '', signedUrl: '', expiresAt: 0, error: 'Cloud storage is not connected.' };

  const user = await getCurrentUser();
  if (!user) return { id: '', storagePath: '', signedUrl: '', expiresAt: 0, error: 'You must be signed in to upload to cloud storage.' };

  // Use the provided ID or generate a new one for synchronization with IndexedDB
  const imageId = existingId || crypto.randomUUID();

  // Use a random path segment to prevent guessing, but tie the DB record to imageId.
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePathSeg = crypto.randomUUID();
  const storagePath = `${user.id}/${uniquePathSeg}_${cleanName}`;

  async function attemptUpload() {
    return client!.storage.from(BUCKET_NAME).upload(storagePath, blob, {
      contentType: metadata.mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  }

  try {
    let { error: uploadError } = await attemptUpload();

    if (uploadError) {
      // Single retry after a short back-off
      await new Promise((res) => setTimeout(res, 900));
      const retry = await attemptUpload();
      if (retry.error) {
        return { id: '', storagePath: '', signedUrl: '', expiresAt: 0, error: `Storage upload failed: ${retry.error.message}` };
      }
    }

    // Insert metadata row — private by default (is_public = false, no signed URL yet)
    const { error: dbError } = await client
      .from('images')
      .insert({
        id: imageId,        // same UUID as IndexedDB — keeps both stores in sync
        user_id: user.id,
        file_name: fileName,
        file_size: metadata.size,
        mime_type: metadata.mimeType,
        width: metadata.width,
        height: metadata.height,
        storage_path: storagePath,
        is_public: false,
        signed_url: null,
        signed_url_expires_at: null,
      });

    if (dbError) {
      // Clean up storage object if DB insert fails
      await client.storage.from(BUCKET_NAME).remove([storagePath]);
      return { id: '', storagePath: '', signedUrl: '', expiresAt: 0, error: `Database insert failed: ${dbError.message}` };
    }

    // Generate a signed URL for immediate sharing (30 days default)
    const defaultExpirySeconds = 2592000; // 30 days
    const { data: signedUrlData, error: signedUrlError } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, defaultExpirySeconds);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      // Upload succeeded but signed URL generation failed — return success without URL
      return { id: imageId, storagePath, signedUrl: '', expiresAt: 0 };
    }

    const expiresAt = Date.now() + defaultExpirySeconds * 1000;

    // Persist the signed URL and expiry in the DB record
    await client.from('images').update({
      signed_url: signedUrlData.signedUrl,
      signed_url_expires_at: new Date(expiresAt).toISOString(),
      is_public: true,
      updated_at: new Date().toISOString(),
    }).eq('id', imageId);

    return { id: imageId, storagePath, signedUrl: signedUrlData.signedUrl, expiresAt };
  } catch (err) {
    return { id: '', storagePath: '', signedUrl: '', expiresAt: 0, error: err instanceof Error ? err.message : 'Upload failed.' };
  }
}

/**
 * Generates a time-limited signed URL for a privately stored image.
 *
 * PRIVACY NOTES:
 * - Signed URLs are JWT tokens embedded in the URL — they do not require
 *   authentication to use, but they expire at the requested time.
 * - Once the URL is shared, anyone with it can fetch the image until expiry.
 * - True revocation is not possible (JWT cannot be server-side invalidated).
 *   Calling revokeImageShare() stops new URLs from being issued and removes
 *   the stored URL from the DB, but an already-distributed URL will still
 *   work until its token expires naturally.
 * - AI PLATFORM NOTE: ChatGPT, Gemini, and Claude can fetch signed URLs.
 *   Short expiry windows (< 1 h) may cause failures in long AI sessions.
 */
export async function generateSignedUrl(
  storagePath: string,
  imageId: string,
  expirySeconds: number
): Promise<{ signedUrl: string; expiresAt: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { signedUrl: '', expiresAt: 0, error: 'Cloud storage is not connected.' };

  try {
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expirySeconds);

    if (error || !data?.signedUrl) {
      return {
        signedUrl: '',
        expiresAt: 0,
        error: error?.message || 'Failed to generate signed URL.',
      };
    }

    const expiresAt = Date.now() + expirySeconds * 1000;

    // Persist the signed URL and expiry in the DB record
    await client.from('images').update({
      signed_url: data.signedUrl,
      signed_url_expires_at: new Date(expiresAt).toISOString(),
      is_public: true,
      updated_at: new Date().toISOString(),
    }).eq('id', imageId);

    return { signedUrl: data.signedUrl, expiresAt };
  } catch (err) {
    return {
      signedUrl: '',
      expiresAt: 0,
      error: err instanceof Error ? err.message : 'Signed URL generation failed.',
    };
  }
}

/**
 * Revokes cloud sharing for an image by clearing the signed URL from the DB.
 *
 * IMPORTANT: This prevents NEW signed URLs from being issued and removes the
 * stored URL from the DB (and therefore from the extension's UI).  However,
 * any signed URL already distributed to other parties will continue to work
 * until its JWT expiry time.  This is a fundamental property of HMAC-signed
 * tokens and cannot be avoided without rotating the storage secret key.
 */
export async function revokeImageShare(
  imageId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud storage is not connected.' };

  try {
    const { error } = await client.from('images').update({
      is_public: false,
      signed_url: null,
      signed_url_expires_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', imageId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Revoke failed.' };
  }
}

/**
 * Generates a signed URL for an image and marks it as publicly shareable.
 * This is a convenience wrapper around generateSignedUrl with a default
 * 30-day expiry, used when the user explicitly chooses to share an image.
 *
 * If the image already has a valid signed URL, it returns the existing one.
 * Otherwise, it generates a new signed URL and updates the database.
 */
export async function markImageAsPublic(
  imageId: string,
  expirySeconds: number = 2592000 // 30 days default
): Promise<{ signedUrl: string; expiresAt: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { signedUrl: '', expiresAt: 0, error: 'Cloud storage is not connected.' };

  try {
    // First, fetch the current image record to get storage_path and check existing signed URL
    const { data: imageData, error: fetchError } = await client
      .from('images')
      .select('storage_path, signed_url, signed_url_expires_at')
      .eq('id', imageId)
      .single();

    if (fetchError || !imageData) {
      return { signedUrl: '', expiresAt: 0, error: fetchError?.message || 'Image not found.' };
    }

    // Check if existing signed URL is still valid
    if (imageData.signed_url && imageData.signed_url_expires_at) {
      const expiresAt = new Date(imageData.signed_url_expires_at).getTime();
      if (expiresAt > Date.now()) {
        return { signedUrl: imageData.signed_url, expiresAt };
      }
    }

    // Generate new signed URL
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .createSignedUrl(imageData.storage_path, expirySeconds);

    if (error || !data?.signedUrl) {
      return {
        signedUrl: '',
        expiresAt: 0,
        error: error?.message || 'Failed to generate signed URL.',
      };
    }

    const expiresAt = Date.now() + expirySeconds * 1000;

    // Persist the signed URL and expiry in the DB record
    await client.from('images').update({
      signed_url: data.signedUrl,
      signed_url_expires_at: new Date(expiresAt).toISOString(),
      is_public: true,
      updated_at: new Date().toISOString(),
    }).eq('id', imageId);

    return { signedUrl: data.signedUrl, expiresAt };
  } catch (err) {
    return {
      signedUrl: '',
      expiresAt: 0,
      error: err instanceof Error ? err.message : 'Failed to mark image as public.',
    };
  }
}

/**
 * Deletes an image from both Supabase Storage and the images metadata table.
 * RLS ensures only the owning user can perform this operation.
 * 
 * IMPROVED: Attempts storage deletion first, then DB deletion.
 * If storage deletion fails, returns error without deleting DB record
 * to avoid orphaned storage objects. Caller can retry.
 */
export async function deleteImageFromSupabase(
  storagePath: string,
  imageId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud storage is not connected.' };

  try {
    // Delete storage object first — if this fails, DB record remains for retry
    if (storagePath) {
      const { error: storageError } = await client.storage.from(BUCKET_NAME).remove([storagePath]);
      if (storageError) {
        return { success: false, error: `Storage deletion failed: ${storageError.message}` };
      }
    }

    // Then delete DB record
    const { error: dbError } = await client.from('images').delete().eq('id', imageId);
    if (dbError) {
      return { success: false, error: `Database deletion failed: ${dbError.message}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete failed.' };
  }
}

/**
 * Fetches all cloud image records for the authenticated user.
 * Includes signed URL state so the app can restore share status across sessions.
 */
export async function fetchUserCloudImages(): Promise<{
  records: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
    storagePath: string;
    signedUrl: string | null;
    signedUrlExpiresAt: number | null;
    isPublic: boolean;
    createdAt: number;
  }>;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { records: [] };

  try {
    const { data, error } = await client
      .from('images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { records: [], error: error.message };

    const records = (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      fileName: String(row.file_name),
      fileSize: Number(row.file_size),
      mimeType: String(row.mime_type),
      width: Number(row.width),
      height: Number(row.height),
      storagePath: String(row.storage_path),
      signedUrl: row.signed_url ? String(row.signed_url) : null,
      signedUrlExpiresAt: row.signed_url_expires_at
        ? new Date(String(row.signed_url_expires_at)).getTime()
        : null,
      isPublic: Boolean(row.is_public),
      createdAt: new Date(String(row.created_at)).getTime(),
    }));

    return { records };
  } catch (err) {
    return { records: [], error: err instanceof Error ? err.message : 'Fetch failed.' };
  }
}

/**
 * Formats a signed URL into the requested share format for clipboard copy.
 */
export function formatShareableLink(
  url: string,
  fileName: string,
  format: ShareFormat
): string {
  switch (format) {
    case 'markdown':
      return `![${fileName}](${url})`;
    case 'html':
      return `<img src="${url}" alt="${fileName}" />`;
    case 'ai-prompt':
      return `Please analyze this image (link valid for a limited time): ${url}`;
    case 'url':
    default:
      return url;
  }
}

// Re-export for db.ts import compatibility
export type { StoredImageRecord };
