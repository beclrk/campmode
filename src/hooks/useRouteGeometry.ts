import { useState, useEffect, useRef } from 'react';
import { Location } from '@/types';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const USER_LOCATION_DEBOUNCE_MS = 2500;

type LatLng = [number, number];

function straightLine(waypoints: LatLng[]): LatLng[] {
  return waypoints.map((wp) => [wp[0], wp[1]]);
}

/**
 * Fetches driving route geometry from OSRM. Route starts at user location
 * (when available, debounced) then visits each stop in order. Falls back
 * to straight-line segments if the API fails or returns no route.
 */
export function useRouteGeometry(
  userLocation: LatLng | null,
  routeStops: Location[]
): { positions: LatLng[] | null; loading: boolean } {
  const [positions, setPositions] = useState<LatLng[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [debouncedUserLocation, setDebouncedUserLocation] = useState<LatLng | null>(userLocation);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce user location so we don't hammer OSRM while the user is moving
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (userLocation === null) {
      setDebouncedUserLocation(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedUserLocation(userLocation);
      debounceRef.current = null;
    }, USER_LOCATION_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [userLocation]);

  useEffect(() => {
    const waypoints: LatLng[] = [];
    if (debouncedUserLocation) waypoints.push(debouncedUserLocation);
    routeStops.forEach((s) => waypoints.push([s.lat, s.lng]));

    if (waypoints.length < 2) {
      setPositions(null);
      setLoading(false);
      return;
    }

    // Show straight line immediately so the map isn't empty while fetching
    setPositions(straightLine(waypoints));
    setLoading(true);

    const coordsForUrl = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${OSRM_BASE}/${coordsForUrl}?overview=full&geometries=geojson`;

    let cancelled = false;

    fetch(url)
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) throw new Error('Route not found');
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data?.routes?.[0]?.geometry?.coordinates) {
          setPositions(straightLine(waypoints));
          return;
        }
        // OSRM returns [lng, lat]; Leaflet wants [lat, lng]
        const coords = data.routes[0].geometry.coordinates as [number, number][];
        setPositions(coords.map(([lng, lat]) => [lat, lng]));
      })
      .catch(() => {
        if (!cancelled) setPositions(straightLine(waypoints));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedUserLocation, routeStops]);

  return { positions, loading };
}
