import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase shadow-lg shadow-green-500/20 hover:scale-105 transition-transform"
      >
        {userInitial}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User info */}
          <div className="px-4 py-3 border-b border-neutral-800">
            <p className="text-white font-medium truncate">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-neutral-500 text-sm truncate">
              {user?.email}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left">
              <Heart className="w-4 h-4" />
              <span>Saved Places</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-neutral-300 hover:bg-neutral-800 transition-colors text-left">
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
        </div>
      )}
    </div>
  );
}
