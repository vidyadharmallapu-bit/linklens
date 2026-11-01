import type { UserPreferences, SortOption, ViewMode, FormatFilter } from '../types';

const STORAGE_KEY = 'linklens_user_preferences';

const DEFAULT_PREFERENCES: UserPreferences = {
  sortOrder: 'newest',
  viewMode: 'grid',
  formatFilter: 'all',
};

const VALID_SORT_OPTIONS = new Set<SortOption>([
  'newest',
  'oldest',
  'name-asc',
  'name-desc',
  'size-desc',
  'size-asc',
]);

const VALID_VIEW_MODES = new Set<ViewMode>(['grid', 'list']);
const VALID_FILTERS = new Set<FormatFilter>(['all', 'jpeg', 'png', 'webp', 'gif']);

/**
 * Loads user preferences from localStorage with fallback to defaults.
 */
export function loadUserPreferences(): UserPreferences {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;

    return {
      sortOrder: parsed.sortOrder && VALID_SORT_OPTIONS.has(parsed.sortOrder)
        ? parsed.sortOrder
        : DEFAULT_PREFERENCES.sortOrder,
      viewMode: parsed.viewMode && VALID_VIEW_MODES.has(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFERENCES.viewMode,
      formatFilter: parsed.formatFilter && VALID_FILTERS.has(parsed.formatFilter)
        ? parsed.formatFilter
        : DEFAULT_PREFERENCES.formatFilter,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Persists updated preferences to localStorage.
 */
export function saveUserPreferences(prefs: Partial<UserPreferences>): void {
  if (typeof localStorage === 'undefined') return;

  try {
    const current = loadUserPreferences();
    const updated: UserPreferences = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Non-fatal if localStorage is restricted
  }
}
