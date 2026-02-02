import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';

const STORAGE_KEY = 'campmode_app_promo_dismissed';

/** Returns true when running in a web browser (not inside native iOS/Android app). */
function isWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !cap?.isNativePlatform?.();
}

// Replace with your real store URLs when apps are published
const APP_STORE_URL = 'https://apps.apple.com/app/campmode/id000000000';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.campmode';

export default function AppPromoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWebApp()) return;
    try {
      const dismissed = sessionStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1000] safe-bottom"
      role="banner"
      aria-label="Get the CampMode app"
    >
      <div className="bg-neutral-900 border-t border-neutral-700 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Get the CampMode app</p>
          <p className="text-neutral-400 text-xs truncate">
            iOS & Android — maps, saves & more on the go
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
          >
            App Store
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors"
          >
            Google Play
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
