import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format distance
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

// Format distance in miles for location card
export function formatDistanceMiles(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${(miles * 10).toFixed(1)} mi`;
  return `${miles.toFixed(1)} mi`;
}

// Price level to display string
export function getPriceLevelLabel(level: number | undefined, price?: string): string {
  if (price) return price;
  if (level === undefined || level === null) return '';
  if (level === 0) return 'Free';
  return '£'.repeat(Math.min(level, 3));
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Get location type label
export function getLocationTypeLabel(type: string): string {
  switch (type) {
    case 'campsite':
      return 'Campsite';
    case 'ev_charger':
      return 'EV Charger';
    case 'rest_stop':
      return 'Rest Stop';
    default:
      return type;
  }
}

// Get location type color
export function getLocationTypeColor(type: string): string {
  switch (type) {
    case 'campsite':
      return '#22c55e'; // Green
    case 'ev_charger':
      return '#3b82f6'; // Blue
    case 'rest_stop':
      return '#f59e0b'; // Amber
    default:
      return '#6b7280'; // Gray
  }
}
