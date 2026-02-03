import { useState, useRef, useEffect } from 'react';
import { Location, Review } from '@/types';
import { 
  X, 
  MapPin, 
  Star, 
  Globe, 
  Phone, 
  Navigation, 
  Route,
  Heart,
  ChevronDown,
  Tent,
  Zap,
  Coffee,
  MessageSquare,
  Camera,
  User as UserIcon,
  ExternalLink
} from 'lucide-react';
import { cn, formatDate, getLocationTypeColor, getLocationTypeLabel, calculateDistance, formatDistanceMiles, getPriceLevelLabel } from '@/lib/utils';
import type { OpeningHours } from '@/types';

interface LocationSheetProps {
  location: Location;
  onClose: () => void;
  reviews: Review[];
  /** For "Distance: X mi away" */
  userLocation?: [number, number] | null;
  isInRoute?: boolean;
  onAddToRoute?: () => void;
  onRemoveFromRoute?: () => void;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
  onAddToTrip?: () => void;
}

const DRAG_CLOSE_THRESHOLD = 100;

function formatOpeningHours(hours: OpeningHours): string[] {
  if (!hours) return [];
  if (typeof hours === 'string') return [hours];
  if (!Array.isArray(hours)) return [];
  return hours.map((h) => {
    if (typeof h === 'object' && h != null && typeof (h as { hours?: string }).hours === 'string') return (h as { hours: string }).hours;
    if (typeof h === 'object' && h != null) {
      const o = (h as { open?: unknown; close?: unknown }).open;
      const c = (h as { open?: unknown; close?: unknown }).close;
      if (typeof o === 'string' && typeof c === 'string') return `${o}-${c}`;
    }
    return '';
  }).filter(Boolean);
}

function isOpenNow(hours: OpeningHours): boolean | null {
  if (!hours || typeof hours !== 'object' || !Array.isArray(hours)) return null;
  const now = new Date();
  const day = now.getDay();
  const time = now.getHours() * 60 + now.getMinutes();
  const today = hours.find((h) => typeof h === 'object' && h != null && (h as { day?: number }).day === day);
  if (!today || typeof today !== 'object') return null;
  const openStr = (today as { open?: unknown }).open;
  const closeStr = (today as { close?: unknown }).close;
  if (typeof openStr !== 'string' || typeof closeStr !== 'string') return null;
  const [openH, openM] = [parseInt(openStr.slice(0, 2), 10), parseInt(openStr.slice(2), 10)];
  const [closeH, closeM] = [parseInt(closeStr.slice(0, 2), 10), parseInt(closeStr.slice(2), 10)];
  if (Number.isNaN(openH) || Number.isNaN(openM) || Number.isNaN(closeH) || Number.isNaN(closeM)) return null;
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  return time >= openMins && time <= closeMins;
}

export default function LocationSheet({ location, onClose, reviews, userLocation, isInRoute, onAddToRoute, onRemoveFromRoute, isSaved, onSave, onUnsave, onAddToTrip }: LocationSheetProps) {
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const typeColor = getLocationTypeColor(location.type ?? '');

  useEffect(() => {
    const handleEl = handleRef.current;
    const sheetEl = sheetRef.current;
    if (!handleEl || !sheetEl) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const dy = Math.max(0, e.clientY - dragStartY.current);
      currentOffsetRef.current = dy;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        sheetEl.style.transition = 'none';
        sheetEl.style.transform = `translateY(${dy}px)`;
        rafRef.current = null;
      });
    };

    const onUp = (e: PointerEvent) => {
      try { handleEl.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', boundUp, true);
      document.removeEventListener('pointercancel', boundUp, true);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const offset = currentOffsetRef.current;
      if (offset >= DRAG_CLOSE_THRESHOLD) {
        onClose();
        sheetEl.style.transition = '';
        sheetEl.style.transform = '';
        return;
      }
      sheetEl.style.transition = 'transform 0.25s ease-out';
      sheetEl.style.transform = 'translateY(0)';
      const onTransitionEnd = () => {
        sheetEl.removeEventListener('transitionend', onTransitionEnd);
        sheetEl.style.transition = '';
      };
      sheetEl.addEventListener('transitionend', onTransitionEnd);
    };
    const boundUp = (e: PointerEvent) => onUp(e);

    const onDown = (e: PointerEvent) => {
      dragStartY.current = e.clientY;
      currentOffsetRef.current = 0;
      try { handleEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      document.addEventListener('pointermove', onMove, { capture: true, passive: false });
      document.addEventListener('pointerup', boundUp, true);
      document.addEventListener('pointercancel', boundUp, true);
    };

    handleEl.addEventListener('pointerdown', onDown);
    return () => {
      handleEl.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', boundUp, true);
      document.removeEventListener('pointercancel', boundUp, true);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [onClose]);
  const TypeIcon = location.type === 'campsite' ? Tent : location.type === 'ev_charger' ? Zap : Coffee;
  const facilities = Array.isArray(location.facilities) ? location.facilities : [];
  const visibleFacilities = showAllFacilities ? facilities : facilities.slice(0, 6);
  const reviewCount = location.review_count ?? location.user_ratings_total ?? reviews.length;
  const distanceM = userLocation ? calculateDistance(userLocation[0], userLocation[1], location.lat, location.lng) : null;
  const openingHoursLines = formatOpeningHours(location.opening_hours ?? null);
  const openNow = isOpenNow(location.opening_hours ?? null);
  const priceLabel = getPriceLevelLabel(location.price_level, location.price);

  const handleNavigate = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`,
      '_blank'
    );
  };

  const handleOpenInGoogle = () => {
    if (location.google_place_id) {
      window.open(`https://www.google.com/maps/place/?q=place_id:${location.google_place_id}`, '_blank');
    } else {
      const query = [location.name, location.address].filter(Boolean).join(' ') || `${location.lat},${location.lng}`;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    }
  };

  const handleWebsite = () => {
    if (location.website) {
      window.open(location.website, '_blank');
    }
  };

  const handleCall = () => {
    if (location.phone) {
      window.open(`tel:${location.phone}`, '_self');
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] location-sheet-wrapper">
      {/* Backdrop - above map panes (Leaflet uses 200-700) */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet - flex column so scroll area gets definite height for iOS */}
      <div
        ref={sheetRef}
        className="relative flex flex-col bg-neutral-900 rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Handle - drag down to dismiss */}
        <div
          ref={handleRef}
          role="button"
          tabIndex={0}
          className="flex-shrink-0 flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          aria-label="Drag down to close"
        >
          <div className="w-10 h-1 bg-neutral-700 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-neutral-400" />
        </button>

        {/* Content - flex-1 min-h-0 gives definite height so swipe-to-scroll works on mobile */}
        <div className="flex-1 min-h-0 px-5 pb-28 hide-scrollbar sheet-scroll">
          {/* Header: icon, type badge, name, rating, distance, price */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${typeColor}20` }}
            >
              <TypeIcon className="w-7 h-7" style={{ color: typeColor }} />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
                >
                  {getLocationTypeLabel(location.type)}
                </span>
                {location.rating != null && (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-white font-medium">{Number(location.rating).toFixed(1)}</span>
                    {reviewCount > 0 && (
                      <span className="text-neutral-500">({reviewCount})</span>
                    )}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white truncate">{location.name}</h2>
              {(distanceM != null || priceLabel) && (
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-400">
                  {distanceM != null && (
                    <span>Distance: {formatDistanceMiles(distanceM)} away</span>
                  )}
                  {priceLabel && (
                    <span className="text-green-500 font-medium">{priceLabel}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick info row: price + facilities as chips */}
          {(priceLabel || facilities.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {priceLabel && (
                <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-sm font-medium">
                  {priceLabel === 'Free' ? '💷 Free' : `💷 ${priceLabel}`}
                </span>
              )}
              {facilities.slice(0, 4).map((f, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-sm">
                  {f ?? ''}
                </span>
              ))}
              {facilities.length > 4 && (
                <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-400 text-sm">
                  +{facilities.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Address - clickable to open in maps */}
          <div 
            className="flex items-start gap-3 mb-4 p-3 bg-neutral-800/50 rounded-xl"
            role="button"
            tabIndex={0}
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || `${location.lat},${location.lng}`)}`, '_blank')}
            onKeyDown={(e) => e.key === 'Enter' && (window as Window & { open: (u: string) => void }).open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address || `${location.lat},${location.lng}`)}`, '_blank')}
          >
            <MapPin className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-neutral-300 text-sm">{location.address || 'Address not listed'}</p>
              {location.price && !priceLabel && (
                <p className="text-green-500 font-semibold mt-1">{location.price}</p>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          </div>

          {/* Description */}
          <p className="text-neutral-400 text-sm leading-relaxed mb-5">
            {location.description ?? ''}
          </p>

          {/* Contact section */}
          {(location.phone || location.website) && (
            <div className="mb-5">
              <h3 className="text-white font-semibold mb-3">Contact</h3>
              <div className="space-y-2">
                {location.phone && (
                  <a
                    href={`tel:${String(location.phone).replace(/\s/g, '')}`}
                    className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl text-neutral-300 hover:bg-neutral-700/50 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="text-sm">{String(location.phone)}</span>
                  </a>
                )}
                {location.website && typeof location.website === 'string' && (
                  <a
                    href={location.website.startsWith('http') ? location.website : `https://${location.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl text-neutral-300 hover:bg-neutral-700/50 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-blue-400 shrink-0" />
                    <span className="text-sm truncate">{location.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="w-4 h-4 shrink-0 ml-auto" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Opening hours - collapsible */}
          {(openingHoursLines.length > 0 || openNow !== null) && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setIsHoursOpen((o) => !o)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-white font-semibold">Opening hours</h3>
                <ChevronDown className={cn("w-5 h-5 text-neutral-400 transition-transform", isHoursOpen && "rotate-180")} />
              </button>
              {openNow !== null && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-2",
                  openNow ? "bg-green-500/20 text-green-400" : "bg-neutral-700 text-neutral-400"
                )}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {openNow ? 'Open Now' : 'Closed'}
                </span>
              )}
              {isHoursOpen && openingHoursLines.length > 0 && (
                <div className="mt-3 space-y-1 text-sm text-neutral-400">
                  {openingHoursLines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Facilities */}
          <div className="mb-5">
            <h3 className="text-white font-semibold mb-3">Facilities</h3>
            <div className="flex flex-wrap gap-2">
              {visibleFacilities.map((facility, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-neutral-800 rounded-full text-sm text-neutral-300"
                >
                  {facility ?? ''}
                </span>
              ))}
              {facilities.length > 6 && !showAllFacilities && (
                <button
                  onClick={() => setShowAllFacilities(true)}
                  className="px-3 py-1.5 bg-neutral-800 rounded-full text-sm text-green-500 hover:bg-neutral-700 transition-colors"
                >
                  +{facilities.length - 6} more
                </button>
              )}
            </div>
          </div>

          {/* Save / Unsave */}
          {(onSave || onUnsave) && (
            <div className="mb-4">
              {isSaved ? (
                <button
                  type="button"
                  onClick={onUnsave}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-red-500/50 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                >
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-sm font-medium">Saved — tap to remove</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSave}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-neutral-600 text-neutral-300 rounded-xl hover:border-red-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-sm font-medium">Save place</span>
                </button>
              )}
            </div>
          )}

          {/* Add to route / Remove from route */}
          {(onAddToRoute || onRemoveFromRoute) && (
            <div className="mb-4">
              {isInRoute ? (
                <button
                  type="button"
                  onClick={onRemoveFromRoute}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-green-500/50 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500/20 transition-colors"
                >
                  <Route className="w-4 h-4" />
                  <span className="text-sm font-medium">Remove from route</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAddToRoute}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-neutral-600 text-neutral-300 rounded-xl hover:border-green-500 hover:text-green-500 hover:bg-green-500/5 transition-colors"
                >
                  <Route className="w-4 h-4" />
                  <span className="text-sm font-medium">Add to route</span>
                </button>
              )}
            </div>
          )}

          {/* Add to Trip - foundation for future trips feature */}
          {onAddToTrip && (
            <div className="mb-4">
              <button
                type="button"
                onClick={onAddToTrip}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-neutral-600 text-neutral-300 rounded-xl hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5 transition-colors"
              >
                <Route className="w-4 h-4" />
                <span className="text-sm font-medium">Add to trip</span>
              </button>
            </div>
          )}

          {/* Action buttons: Website, Call, Navigate, Open in Google */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {location.website && typeof location.website === 'string' && (
              <button
                onClick={handleWebsite}
                className="flex flex-col items-center justify-center gap-1.5 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-neutral-300">Website</span>
              </button>
            )}
            {location.phone && (
              <button
                onClick={handleCall}
                className="flex flex-col items-center justify-center gap-1.5 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <Phone className="w-5 h-5 text-green-400" />
                <span className="text-xs text-neutral-300">Call</span>
              </button>
            )}
            <button
              onClick={handleNavigate}
              className="flex flex-col items-center justify-center gap-1.5 p-4 bg-white rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <Navigation className="w-5 h-5 text-neutral-900" />
              <span className="text-xs text-neutral-900 font-medium">Navigate</span>
            </button>
            <button
              onClick={handleOpenInGoogle}
              className="flex flex-col items-center justify-center gap-1.5 p-4 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors"
            >
              <ExternalLink className="w-5 h-5 text-neutral-300" />
              <span className="text-xs text-neutral-300">Open in Google</span>
            </button>
          </div>

          {/* Reviews section */}
          <div className="border-t border-neutral-800 pt-5">
            <button
              onClick={() => setIsReviewsOpen(!isReviewsOpen)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-white font-semibold">
                <MessageSquare className="w-5 h-5" />
                Reviews ({reviews.length})
              </div>
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-neutral-400 transition-transform",
                  isReviewsOpen && "rotate-180"
                )} 
              />
            </button>

            {isReviewsOpen && (
              <div className="mt-4 space-y-4">
                {/* Add review button */}
                <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-neutral-700 rounded-xl text-green-500 hover:border-green-500 hover:bg-green-500/5 transition-colors">
                  <Camera className="w-4 h-4" />
                  <span className="text-sm font-medium">Add your review</span>
                </button>

                {/* Reviews list */}
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-neutral-800/50 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-neutral-400" />
                          </div>
                          <span className="text-sm font-medium text-white">{review.user_name}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{formatDate(review.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-neutral-600"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-neutral-300 leading-relaxed">{review.comment}</p>
                      {review.photos.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                          {review.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo}
                              alt=""
                              loading="lazy"
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    No reviews yet. Be the first to share your experience!
                  </div>
                )}

                {/* Google Reviews link (when we have a Google Place ID) */}
                {location.google_place_id && (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${location.google_place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-neutral-800 rounded-xl text-neutral-300 hover:bg-neutral-700 transition-colors"
                  >
                    <img 
                      src="https://www.google.com/favicon.ico" 
                      alt="Google" 
                      className="w-4 h-4"
                    />
                    <span className="text-sm">View Google Reviews</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                {/* Open Charge Map link for EV chargers without Google Place */}
                {location.type === 'ev_charger' && location.ocm_id && (
                  <a
                    href={`https://openchargemap.org/site/poi/details/${location.ocm_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-neutral-800 rounded-xl text-neutral-300 hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-sm">View on Open Charge Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
