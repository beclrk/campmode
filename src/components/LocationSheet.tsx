import { useState, useRef, useEffect } from 'react';
import { Location, Review } from '@/types';
import { 
  X, 
  MapPin, 
  Star, 
  Globe, 
  Phone, 
  Navigation, 
  ChevronDown,
  Tent,
  Zap,
  Coffee,
  MessageSquare,
  Camera,
  User as UserIcon,
  ExternalLink
} from 'lucide-react';
import { cn, formatDate, getLocationTypeColor, getLocationTypeLabel } from '@/lib/utils';

interface LocationSheetProps {
  location: Location;
  onClose: () => void;
  reviews: Review[];
}

const DRAG_CLOSE_THRESHOLD = 100;

export default function LocationSheet({ location, onClose, reviews }: LocationSheetProps) {
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [showAllFacilities, setShowAllFacilities] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentOffsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const typeColor = getLocationTypeColor(location.type);

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
  
  const visibleFacilities = showAllFacilities ? location.facilities : location.facilities.slice(0, 6);

  const handleNavigate = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`,
      '_blank'
    );
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
    <div className="absolute bottom-0 left-0 right-0 z-[1000] safe-bottom">
      {/* Backdrop - above map panes (Leaflet uses 200-700) */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet - transform updated directly during drag for smooth mobile */}
      <div
        ref={sheetRef}
        className="relative bg-neutral-900 rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        {/* Handle - drag down to dismiss */}
        <div
          ref={handleRef}
          role="button"
          tabIndex={0}
          className="flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing select-none"
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

        {/* Content - scrollable; pb-28 so bottom isn't hidden behind app promo banner on mobile */}
        <div className="px-5 pb-28 overflow-y-auto max-h-[calc(85vh-40px)] hide-scrollbar sheet-scroll min-h-0">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${typeColor}20` }}
            >
              <TypeIcon className="w-7 h-7" style={{ color: typeColor }} />
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-1"
                style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
              >
                {getLocationTypeLabel(location.type)}
              </div>
              <h2 className="text-xl font-bold text-white truncate">{location.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-white font-medium">4.8</span>
                  <span className="text-neutral-500 text-sm">({reviews.length} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 mb-4 p-3 bg-neutral-800/50 rounded-xl">
            <MapPin className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-neutral-300 text-sm">{location.address}</p>
              {location.price && (
                <p className="text-green-500 font-semibold mt-1">{location.price}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-neutral-400 text-sm leading-relaxed mb-5">
            {location.description}
          </p>

          {/* Facilities */}
          <div className="mb-5">
            <h3 className="text-white font-semibold mb-3">Facilities</h3>
            <div className="flex flex-wrap gap-2">
              {visibleFacilities.map((facility, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-neutral-800 rounded-full text-sm text-neutral-300"
                >
                  {facility}
                </span>
              ))}
              {location.facilities.length > 6 && !showAllFacilities && (
                <button
                  onClick={() => setShowAllFacilities(true)}
                  className="px-3 py-1.5 bg-neutral-800 rounded-full text-sm text-green-500 hover:bg-neutral-700 transition-colors"
                >
                  +{location.facilities.length - 6} more
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {location.website && (
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
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-4 bg-white rounded-xl hover:bg-neutral-100 transition-colors",
                !location.website && !location.phone && "col-span-3",
                (location.website && !location.phone) || (!location.website && location.phone) ? "col-span-2" : ""
              )}
            >
              <Navigation className="w-5 h-5 text-neutral-900" />
              <span className="text-xs text-neutral-900 font-medium">Navigate</span>
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

                {/* Google Reviews link */}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
