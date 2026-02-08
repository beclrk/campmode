import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Settings, Heart, Route } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number } | null>(null);

  const DROPDOWN_WIDTH = 224; // w-56

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const left = Math.min(
        rect.right - DROPDOWN_WIDTH,
        typeof window !== 'undefined' ? window.innerWidth - DROPDOWN_WIDTH - 8 : rect.right - DROPDOWN_WIDTH
      );
      setDropdownRect({
        top: rect.bottom + 8,
        left: Math.max(8, left),
      });
    }
    setIsOpen(true);
  };

  // Close when clicking outside trigger or dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U';

  const dropdownContent = isOpen && dropdownRect && (
    <div
      ref={dropdownRef}
      className="fixed w-56 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 z-[9999]"
      style={{ top: dropdownRect.top, left: dropdownRect.left }}
    >
          {user ? (
            <>
              {/* User info - clickable, goes to Settings Account section */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/settings#account');
                }}
                className="w-full px-4 py-3 border-b border-neutral-800 text-left hover:bg-neutral-800/50 transition-colors"
              >
                <p className="text-white font-medium truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-neutral-500 text-sm truncate">
                  {user.email}
                </p>
              </button>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/saved');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Heart className="w-4 h-4" />
                  <span>Saved Places</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/trips');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Route className="w-4 h-4" />
                  <span>My Trips</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Sign out */}
              <div className="border-t border-neutral-800 py-1">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-neutral-800 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign in / Create account</span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            </>
          )}
    </div>
  );

  return (
    <div className="relative">
      {/* Avatar or Sign in button */}
      <button
        ref={triggerRef}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase shadow-lg shadow-green-500/20 hover:scale-105 transition-transform"
      >
        {user ? userInitial : <LogIn className="w-5 h-5" />}
      </button>

      {/* Dropdown via portal so it sits above categories and is never clipped */}
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
