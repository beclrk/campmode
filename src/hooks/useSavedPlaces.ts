import { useState, useEffect, useCallback } from 'react';
import { Location } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_PREFIX = 'campmode_saved_places_';

function storageKey(userId: string | undefined): string {
  return `${STORAGE_PREFIX}${userId ?? 'guest'}`;
}

function loadFromStorage(key: string): Location[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Location[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(key: string, places: Location[]) {
  try {
    localStorage.setItem(key, JSON.stringify(places));
  } catch {
    // ignore quota or other errors
  }
}

/**
 * Saved places for the current user (or guest). Persisted in localStorage.
 * When the user logs in/out, we use a different key so saved places are per-identity.
 */
export function useSavedPlaces() {
  const { user } = useAuth();
  const key = storageKey(user?.id);
  const [savedPlaces, setSavedPlaces] = useState<Location[]>(() => loadFromStorage(key));

  // Reload when user changes (login/logout)
  useEffect(() => {
    setSavedPlaces(loadFromStorage(key));
  }, [key]);

  // Persist whenever list changes
  useEffect(() => {
    saveToStorage(key, savedPlaces);
  }, [key, savedPlaces]);

  const addSaved = useCallback((location: Location) => {
    setSavedPlaces((prev) =>
      prev.some((p) => p.id === location.id) ? prev : [...prev, location]
    );
  }, []);

  const removeSaved = useCallback((locationId: string) => {
    setSavedPlaces((prev) => prev.filter((p) => p.id !== locationId));
  }, []);

  const isSaved = useCallback(
    (locationId: string) => savedPlaces.some((p) => p.id === locationId),
    [savedPlaces]
  );

  return { savedPlaces, addSaved, removeSaved, isSaved };
}
