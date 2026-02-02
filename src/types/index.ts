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
