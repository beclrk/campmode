import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Trip } from '@/types';

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    if (!user?.id) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('trips')
      .select('id, name, description, locations, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('useTrips load error:', error);
      setTrips([]);
    } else {
      const list = (rows ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        description: r.description != null ? String(r.description) : undefined,
        locationIds: Array.isArray(r.locations) ? (r.locations as string[]) : [],
        created_at: r.created_at != null ? String(r.created_at) : undefined,
        updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
      }));
      setTrips(list);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const createTrip = useCallback(
    async (name: string) => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('trips')
        .insert({ user_id: user.id, name, locations: [] })
        .select('id, name, description, locations, created_at, updated_at')
        .single();

      if (error) {
        console.error('createTrip error:', error);
        return null;
      }
      const trip: Trip = {
        id: String(data.id),
        name: String(data.name ?? ''),
        description: data.description != null ? String(data.description) : undefined,
        locationIds: Array.isArray(data.locations) ? (data.locations as string[]) : [],
        created_at: data.created_at != null ? String(data.created_at) : undefined,
        updated_at: data.updated_at != null ? String(data.updated_at) : undefined,
      };
      setTrips((prev) => [trip, ...prev]);
      return trip;
    },
    [user?.id]
  );

  const updateTrip = useCallback(
    async (tripId: string, updates: { name?: string; locationIds?: string[] }) => {
      if (!user?.id) return false;
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.locationIds !== undefined) payload.locations = updates.locationIds;

      const { error } = await supabase.from('trips').update(payload).eq('id', tripId).eq('user_id', user.id);

      if (error) {
        console.error('updateTrip error:', error);
        return false;
      }
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                ...(updates.name !== undefined && { name: updates.name }),
                ...(updates.locationIds !== undefined && { locationIds: updates.locationIds }),
              }
            : t
        )
      );
      return true;
    },
    [user?.id]
  );

  const addLocationToTrip = useCallback(
    async (tripId: string, locationId: string) => {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip || trip.locationIds.includes(locationId)) return false;
      const locationIds = [...trip.locationIds, locationId];
      return updateTrip(tripId, { locationIds });
    },
    [trips, updateTrip]
  );

  const removeLocationFromTrip = useCallback(
    async (tripId: string, locationId: string) => {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) return false;
      const locationIds = trip.locationIds.filter((id) => id !== locationId);
      return updateTrip(tripId, { locationIds });
    },
    [trips, updateTrip]
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      if (!user?.id) return false;
      const { error } = await supabase.from('trips').delete().eq('id', tripId).eq('user_id', user.id);

      if (error) {
        console.error('deleteTrip error:', error);
        return false;
      }
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      return true;
    },
    [user?.id]
  );

  return {
    trips,
    loading,
    createTrip,
    updateTrip,
    addLocationToTrip,
    removeLocationFromTrip,
    deleteTrip,
    refetch: loadTrips,
  };
}
