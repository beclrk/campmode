// Location types
export type LocationType = 'campsite' | 'ev_charger' | 'rest_stop';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  lat: number;
  lng: number;
  description: string;
  address: string;
  price?: string;
  facilities: string[];
  images: string[];
  website?: string;
  phone?: string;
  google_place_id?: string;
  /** Open Charge Map POI ID – used for "View on Open Charge Map" link when no Google place */
  ocm_id?: number;
  /** Google rating 1–5; used to prioritise popular places when zoomed out */
  rating?: number;
  /** Google review count; used with rating for popularity score */
  user_ratings_total?: number;
  created_at: string;
  updated_at: string;
}

// Review types
export interface Review {
  id: string;
  location_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  photos: string[];
  created_at: string;
}

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url?: string;
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

// Filter types
export interface LocationFilters {
  type: LocationType | 'all';
  searchQuery: string;
}
