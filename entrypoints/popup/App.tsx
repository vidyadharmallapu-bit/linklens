import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { AuthModal } from './components/AuthModal';
import { BulkDeleteModal } from './components/BulkDeleteModal';
import { EmptyState } from './components/EmptyState';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Icon } from './components/Icon';
import { ImageGallery } from './components/ImageGallery';
import { ImagePreview } from './components/ImagePreview';
import { SettingsModal } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { StorageSummary } from './components/StorageSummary';
import { UploadZone } from './components/UploadZone';
import { SAMPLE_IMAGES } from './sampleImages';
import {
  clearAllImages,
  deleteImage,
  getAllImages,
  getStorageMetrics,
  saveImage,
} from './services/db';
import {
  deleteImageFromSupabase,
  getCurrentUser,
  isSupabaseConfigured,
  signOutUser,
  uploadImageToSupabase,
} from './services/supabase';
import type {
  AuthUser,
  FormatFilter,
  GalleryImage,
  SortOption,
  ValidationFailure,
  ViewMode,
} from './types';
import { processFilesForUpload } from './utils/fileValidation';
import {
  loadUserPreferences,
  saveUserPreferences,
} from './utils/preferences';

export function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());
  const toastTimeout = useRef<number | null>(null);

  // User & Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Gallery and Mock state
  const [uploads, setUploads] = useState<GalleryImage[]>([]);
  const [examples, setExamples] = useState<GalleryImage[]>(SAMPLE_IMAGES);
  const [showExamples, setShowExamples] = useState(false);

  // Persistent User Preferences
  const initialPrefs = useMemo(() => loadUserPreferences(), []);
  const [sortOrder, setSortOrder] = useState<SortOption>(initialPrefs.sortOrder);
  const [viewMode, setViewMode] = useState<ViewMode>(initialPrefs.viewMode);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>(initialPrefs.formatFilter);

  // Search, Selection & Share Modal state
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [shareModalImage, setShareModalImage] = useState<GalleryImage | null>(null);

  // Modals and UI state
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationFailure[]>([]);

  // Phase 4 IndexedDB state
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [quotaBytes, setQuotaBytes] = useState<number | null>(null);
  const [browserUsageBytes, setBrowserUsageBytes] = useState<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current !== null) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast('');
    }, 3800);
  }

  // Preference updates with persistence
  function handleSortChange(newSort: SortOption) {
    setSortOrder(newSort);
    saveUserPreferences({ sortOrder: newSort });
  }

  function handleViewChange(newView: ViewMode) {
    setViewMode(newView);
    saveUserPreferences({ viewMode: newView });
  }

  function handleFilterChange(newFilter: FormatFilter) {
    setFormatFilter(newFilter);
    saveUserPreferences({ formatFilter: newFilter });
  }

  // Load persistent images from IndexedDB
  const loadDatabaseImages = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);

    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();

    try {
      const records = await getAllImages();

      const restoredImages: GalleryImage[] = records.map((record) => {
        const url = URL.createObjectURL(record.blob);
        objectUrls.current.add(url);
        return {
          id: record.id,
          name: record.fileName,
          size: record.fileSize,
          createdAt: record.createdAt,
          url,
          source: 'upload',
          width: record.width,
          height: record.height,
          mimeType: record.mimeType,
          fileKey: `${record.fileName.toLowerCase().trim()}-${record.fileSize}-${record.createdAt}`,
          blob: record.blob,
          publicUrl: record.publicUrl,
          storagePath: record.storagePath,
          userId: record.userId,
        };
      });

      setUploads(restoredImages);

      // Check current auth user session
      const authUser = await getCurrentUser();
      setCurrentUser(authUser);

      // Fetch real browser quota metrics
      const metrics = await getStorageMetrics();
      setQuotaBytes(metrics.quotaBytes);
      setBrowserUsageBytes(metrics.browserUsageBytes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to IndexedDB.';
      setDbError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize DB on mount and clean up URLs on unmount
  useEffect(() => {
    loadDatabaseImages();

    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      if (toastTimeout.current !== null) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, [loadDatabaseImages]);

  // Upload handler with automatic Supabase sync if user is logged in
  async function handleFiles(files: File[]) {
    if (files.length === 0) return;

    setIsProcessing(true);
    setValidationErrors([]);

    try {
      const result = await processFilesForUpload(files, uploads);
      const successfullyPersisted: GalleryImage[] = [];

      for (const img of result.accepted) {
        if (img.blob) {
          try {
            let publicUrl: string | undefined;
            let storagePath: string | undefined;
            let signedUrlExpiresAt: number | undefined;

            // If user is authenticated and Supabase is configured, upload to cloud storage
            if (currentUser && isSupabaseConfigured()) {
              const cloudResult = await uploadImageToSupabase(img.blob, img.name, {
                width: img.width || 0,
                height: img.height || 0,
                size: img.size,
                mimeType: img.mimeType || 'image/png',
              }, img.id);

              if (!cloudResult.error && cloudResult.signedUrl) {
                publicUrl = cloudResult.signedUrl;
                storagePath = cloudResult.storagePath;
                signedUrlExpiresAt = cloudResult.expiresAt;
              }
            }

            // Save to local IndexedDB (with cloud metadata if synced)
            await saveImage({
              id: img.id,
              blob: img.blob,
              fileName: img.name,
              mimeType: img.mimeType || 'image/png',
              fileSize: img.size,
              width: img.width || 0,
              height: img.height || 0,
              createdAt: img.createdAt,
              updatedAt: img.createdAt,
              publicUrl,
              signedUrlExpiresAt,
              storagePath,
              userId: currentUser?.id,
            });

            objectUrls.current.add(img.url);

            successfullyPersisted.push({
              ...img,
              publicUrl,
              signedUrlExpiresAt,
              storagePath,
              userId: currentUser?.id,
            });
          } catch {
            URL.revokeObjectURL(img.url);
            result.rejected.push({
              filename: img.name,
              reason: 'Failed to write image data to IndexedDB.',
            });
          }
        }
      }

      if (successfullyPersisted.length > 0) {
        setUploads((prev) => [...successfullyPersisted, ...prev]);
        setShowExamples(false);
        setQuery('');

        const metrics = await getStorageMetrics();
        setQuotaBytes(metrics.quotaBytes);
        setBrowserUsageBytes(metrics.browserUsageBytes);
      }

      if (result.rejected.length > 0) {
        setValidationErrors(result.rejected);
      }

      const cloudCount = successfullyPersisted.filter((i) => i.publicUrl).length;

      if (successfullyPersisted.length > 0 && result.rejected.length > 0) {
        showToast(
          `${successfullyPersisted.length} ${successfullyPersisted.length === 1 ? 'image' : 'images'} saved; ${result.rejected.length} skipped.`
        );
      } else if (cloudCount > 0) {
        showToast(`${cloudCount} ${cloudCount === 1 ? 'image' : 'images'} uploaded to Supabase with public HTTPS links.`);
      } else if (successfullyPersisted.length > 0) {
        showToast(
          `${successfullyPersisted.length} ${successfullyPersisted.length === 1 ? 'image' : 'images'} stored in IndexedDB.`
        );
      } else if (result.rejected.length > 0) {
        showToast(`Could not add ${result.rejected.length === 1 ? 'file' : 'files'}. See details below.`);
      }
    } catch {
      showToast('An unexpected error occurred while saving files.');
    } finally {
      setIsProcessing(false);
    }
  }

  // On-demand upload of an individual local image to Supabase
  async function handleUploadImageToCloud(image: GalleryImage): Promise<void> {
    if (!currentUser) {
      setShareModalImage(null);
      setAuthModalOpen(true);
      showToast('Please sign in to upload images to Supabase Cloud.');
      return;
    }

    if (!image.blob) {
      showToast('Image binary data is not available for upload.');
      return;
    }

    const cloudResult = await uploadImageToSupabase(image.blob, image.name, {
      width: image.width || 0,
      height: image.height || 0,
      size: image.size,
      mimeType: image.mimeType || 'image/png',
    }, image.id);

    if (cloudResult.error || !cloudResult.signedUrl) {
      showToast(cloudResult.error || 'Failed to generate cloud link.');
      return;
    }

    // Update record in IndexedDB
    await saveImage({
      id: image.id,
      blob: image.blob,
      fileName: image.name,
      mimeType: image.mimeType || 'image/png',
      fileSize: image.size,
      width: image.width || 0,
      height: image.height || 0,
      createdAt: image.createdAt,
      updatedAt: Date.now(),
      publicUrl: cloudResult.signedUrl,
      signedUrlExpiresAt: cloudResult.expiresAt,
      storagePath: cloudResult.storagePath,
      userId: currentUser.id,
    });

    // Update state
    setUploads((prev) =>
      prev.map((item) =>
        item.id === image.id
          ? {
              ...item,
              publicUrl: cloudResult.signedUrl,
              signedUrlExpiresAt: cloudResult.expiresAt,
              storagePath: cloudResult.storagePath,
              userId: currentUser.id,
            }
          : item
      )
    );

    if (shareModalImage?.id === image.id) {
      setShareModalImage({
        ...shareModalImage,
        publicUrl: cloudResult.signedUrl,
        signedUrlExpiresAt: cloudResult.expiresAt,
        storagePath: cloudResult.storagePath,
        userId: currentUser.id,
      });
    }

    showToast('Public HTTPS link generated and cloud synced!');
  }

  async function handleDelete(image: GalleryImage) {
    if (image.source === 'example') {
      setExamples((prev) => prev.filter((item) => item.id !== image.id));
      if (examples.length <= 1 && uploads.length === 0) {
        setShowExamples(false);
      }
      showToast('Sample hidden.');
    } else {
      try {
        // If stored in Supabase Cloud, delete from storage & db
        if (image.storagePath) {
          await deleteImageFromSupabase(image.storagePath, image.id);
        }

        // Delete from local IndexedDB
        await deleteImage(image.id);
        URL.revokeObjectURL(image.url);
        objectUrls.current.delete(image.url);

        setUploads((prev) => prev.filter((item) => item.id !== image.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(image.id);
          return next;
        });

        const metrics = await getStorageMetrics();
        setQuotaBytes(metrics.quotaBytes);
        setBrowserUsageBytes(metrics.browserUsageBytes);

        showToast('Image deleted.');
      } catch {
        showToast('Failed to delete image.');
      }
    }

    if (selectedImage?.id === image.id) {
      setSelectedImage(null);
    }
  }

  // Bulk selection toggles
  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAllVisible(visibleList: GalleryImage[]) {
    setSelectedIds(new Set(visibleList.map((img) => img.id)));
  }

  function handleDeselectAll() {
    setSelectedIds(new Set());
  }

  // Bulk delete execution
  async function handleConfirmBulkDelete() {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    let deleteCount = 0;

    for (const id of idsToDelete) {
      const img = uploads.find((u) => u.id === id);
      if (img) {
        try {
          if (img.storagePath) {
            await deleteImageFromSupabase(img.storagePath, img.id);
          }
          await deleteImage(id);
          URL.revokeObjectURL(img.url);
          objectUrls.current.delete(img.url);
          deleteCount++;
        } catch {
          // Continue deleting others
        }
      }
    }

    setUploads((prev) => prev.filter((img) => !selectedIds.has(img.id)));
    setSelectedIds(new Set());
    setShowBulkDeleteModal(false);

    if (selectedImage && selectedIds.has(selectedImage.id)) {
      setSelectedImage(null);
    }

    const metrics = await getStorageMetrics();
    setQuotaBytes(metrics.quotaBytes);
    setBrowserUsageBytes(metrics.browserUsageBytes);

    showToast(`${deleteCount} ${deleteCount === 1 ? 'image' : 'images'} deleted.`);
  }

  async function handleCopy(image: GalleryImage) {
    if (image.source === 'example') {
      showToast('Sample visuals are for preview only. Upload an image to get a link.');
      return;
    }

    // If public HTTPS URL exists, copy it directly
    const linkToCopy = image.publicUrl || image.url;

    try {
      await navigator.clipboard.writeText(linkToCopy);
      if (image.publicUrl) {
        showToast('Public HTTPS link copied! Ready for AI tools.');
      } else {
        showToast('Local preview URL copied. Click share for AI HTTPS link.');
      }
    } catch {
      showToast('Unable to copy URL. Please check clipboard permissions.');
    }
  }

  async function handleClearSession() {
    try {
      await clearAllImages();
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
      setUploads([]);
      setSelectedIds(new Set());
      setSelectedImage(null);
      setValidationErrors([]);

      const metrics = await getStorageMetrics();
      setQuotaBytes(metrics.quotaBytes);
      setBrowserUsageBytes(metrics.browserUsageBytes);

      showToast('All stored images deleted from local IndexedDB.');
    } catch {
      showToast('Failed to clear IndexedDB gallery.');
    }
  }

  async function handleSignOut() {
    await signOutUser();
    setCurrentUser(null);
    showToast('Signed out of LinkLens Cloud.');
  }

  // Filter and Sort Pipeline
  const visibleImages = useMemo(() => {
    const list = showExamples ? [...uploads, ...examples] : uploads;
    const filterText = query.trim().toLowerCase();

    return list
      .filter((img) => {
        if (filterText && !img.name.toLowerCase().includes(filterText)) {
          return false;
        }

        if (formatFilter !== 'all') {
          const ext = img.name.split('.').pop()?.toLowerCase();
          const mime = img.mimeType?.toLowerCase() || '';

          if (formatFilter === 'jpeg') {
            if (ext !== 'jpg' && ext !== 'jpeg' && !mime.includes('jpeg')) return false;
          } else if (formatFilter === 'png') {
            if (ext !== 'png' && !mime.includes('png')) return false;
          } else if (formatFilter === 'webp') {
            if (ext !== 'webp' && !mime.includes('webp')) return false;
          } else if (formatFilter === 'gif') {
            if (ext !== 'gif' && !mime.includes('gif')) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOrder) {
          case 'oldest':
            return a.createdAt - b.createdAt;
          case 'name-asc':
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          case 'name-desc':
            return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
          case 'size-desc':
            return b.size - a.size;
          case 'size-asc':
            return a.size - b.size;
          case 'newest':
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [examples, formatFilter, query, showExamples, sortOrder, uploads]);

  const bytesUsed = uploads.reduce((acc, curr) => acc + curr.size, 0);
  const totalCount = uploads.length + (showExamples ? examples.length : 0);

  const currentPreviewIndex = useMemo(() => {
    if (!selectedImage) return -1;
    return visibleImages.findIndex((img) => img.id === selectedImage.id);
  }, [selectedImage, visibleImages]);

  return (
    <div className="extension-root">
      <div className="popup-container">
        <Header
          profileOpen={authModalOpen}
          settingsOpen={settingsOpen}
          userEmail={currentUser?.email}
          isCloudActive={Boolean(currentUser)}
          onToggleProfile={() => {
            setAuthModalOpen((prev) => !prev);
            setSettingsOpen(false);
          }}
          onToggleSettings={() => {
            setSettingsOpen((prev) => !prev);
            setAuthModalOpen(false);
          }}
        />

        <main className="popup-body">
          <Hero onBrowseClick={() => fileInputRef.current?.click()} />

          <UploadZone
            inputRef={fileInputRef}
            onFiles={handleFiles}
            onOpenPicker={() => fileInputRef.current?.click()}
            isProcessing={isProcessing}
          />

          {validationErrors.length > 0 && (
            <section className="validation-alert-card" aria-label="Upload notices">
              <div className="validation-alert-header">
                <span className="validation-alert-icon">
                  <Icon name="close" size={13} />
                </span>
                <span className="validation-alert-title">
                  {validationErrors.length === 1 ? '1 file could not be added' : `${validationErrors.length} files could not be added`}
                </span>
                <button
                  type="button"
                  className="dismiss-alert-btn"
                  onClick={() => setValidationErrors([])}
                  aria-label="Dismiss upload notices"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
              <ul className="validation-error-list">
                {validationErrors.map((err, idx) => (
                  <li key={`${err.filename}-${idx}`} className="validation-error-item">
                    <span className="error-filename" title={err.filename}>{err.filename}</span>
                    <span className="error-reason">{err.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <StorageSummary
            imageCount={uploads.length}
            bytesUsed={bytesUsed}
            quotaBytes={quotaBytes}
            browserUsageBytes={browserUsageBytes}
            isDbReady={!dbError}
          />

          {/* Database connection failure state */}
          {dbError && (
            <div className="db-error-card" role="alert">
              <span className="db-error-title">Storage Unavailable</span>
              <p className="db-error-desc">
                Could not connect to local IndexedDB. {dbError}
              </p>
              <button
                type="button"
                className="retry-button"
                onClick={loadDatabaseImages}
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Loading state while restoring from IndexedDB */}
          {isLoading ? (
            <div className="gallery-loading-card" role="status" aria-live="polite">
              <span className="spinner-icon" aria-hidden="true" />
              <span className="gallery-loading-text">Restoring gallery from IndexedDB...</span>
            </div>
          ) : uploads.length === 0 && !showExamples ? (
            <EmptyState
              onUpload={() => fileInputRef.current?.click()}
              onShowExamples={() => setShowExamples(true)}
            />
          ) : (
            <ImageGallery
              images={visibleImages}
              totalCount={totalCount}
              isShowingExamples={showExamples}
              onHideExamples={() => setShowExamples(false)}
              query={query}
              sortOrder={sortOrder}
              viewMode={viewMode}
              formatFilter={formatFilter}
              selectedIds={selectedIds}
              onQueryChange={setQuery}
              onSortChange={handleSortChange}
              onViewChange={handleViewChange}
              onFilterChange={handleFilterChange}
              onToggleSelect={handleToggleSelect}
              onSelectAll={() => handleSelectAllVisible(visibleImages)}
              onDeselectAll={handleDeselectAll}
              onRequestBulkDelete={() => setShowBulkDeleteModal(true)}
              onPreview={setSelectedImage}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onShare={(img) => setShareModalImage(img)}
            />
          )}
        </main>

        <Footer
          imageCount={uploads.length}
          onOpenSettings={() => {
            setSettingsOpen((prev) => !prev);
            setAuthModalOpen(false);
          }}
        />
      </div>

      {/* Supabase Authentication Modal */}
      {authModalOpen && (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            showToast(`Signed in as ${user.email}`);
          }}
          onSignOut={handleSignOut}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onClearSession={handleClearSession}
        />
      )}

      {/* Lightbox Modal with Carousel Navigation */}
      {selectedImage && (
        <ImagePreview
          image={selectedImage}
          images={visibleImages}
          currentIndex={currentPreviewIndex}
          onClose={() => setSelectedImage(null)}
          onCopy={handleCopy}
          onNavigate={(newIndex) => {
            const nextImg = visibleImages[newIndex];
            if (nextImg) {
              setSelectedImage(nextImg);
            }
          }}
        />
      )}

      {/* Shareable Link Modal with AI Formats */}
      {shareModalImage && (
        <ShareModal
          image={shareModalImage}
          onClose={() => setShareModalImage(null)}
          onUploadToCloud={handleUploadImageToCloud}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          count={selectedIds.size}
          onConfirm={handleConfirmBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}

      <div
        className={`toast-notification ${toast ? 'is-active' : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}

export default App;
