import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/types';

interface ReviewRow {
  id: string;
  location_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  photos: string[];
  created_at: string;
  user_name: string | null;
  user_avatar?: string | null;
}

function rowToReview(r: ReviewRow): Review {
  return {
    id: r.id,
    location_id: r.location_id,
    user_id: r.user_id,
    user_name: r.user_name ?? 'Anonymous',
    rating: Number(r.rating),
    comment: r.comment ?? '',
    photos: Array.isArray(r.photos) ? r.photos : [],
    created_at: r.created_at,
  };
}

/**
 * Fetches reviews for a location from reviews_with_profiles view.
 * Submit and delete use the reviews table with RLS (authenticated user).
 */
export function useReviewsForLocation(locationId: string | null) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!locationId) {
      setReviews([]);
      return;
    }
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('reviews_with_profiles')
      .select('id, location_id, user_id, rating, comment, photos, created_at, user_name, user_avatar')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('useReviewsForLocation fetch error:', error);
      setReviews([]);
    } else {
      setReviews((rows ?? []).map((r) => rowToReview(r as unknown as ReviewRow)));
    }
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const submitReview = useCallback(
    async (rating: number, comment: string): Promise<{ ok: boolean; error?: string }> => {
      if (!locationId || !user?.id) {
        return { ok: false, error: 'Sign in to add a review' };
      }
      if (rating < 1 || rating > 5) {
        return { ok: false, error: 'Rating must be 1–5' };
      }

      const { error } = await supabase.from('reviews').insert({
        location_id: locationId,
        user_id: user.id,
        rating: Math.round(rating),
        comment: comment.trim() || null,
        photos: [],
      });

      if (error) {
        console.error('submitReview error:', error);
        return { ok: false, error: error.message };
      }
      await refetch();
      return { ok: true };
    },
    [locationId, user?.id, refetch]
  );

  const deleteReview = useCallback(
    async (reviewId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user?.id) return { ok: false, error: 'Sign in to delete' };

      const { error } = await supabase.from('reviews').delete().eq('id', reviewId).eq('user_id', user.id);

      if (error) {
        console.error('deleteReview error:', error);
        return { ok: false, error: error.message };
      }
      await refetch();
      return { ok: true };
    },
    [user?.id, refetch]
  );

  return { reviews, loading, refetch, submitReview, deleteReview };
}
