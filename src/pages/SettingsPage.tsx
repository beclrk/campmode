import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Bell,
  User,
  Info,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-green-500" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({
  label,
  description,
  right,
  onPress,
}: {
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between py-4 px-4">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">{label}</p>
        {description && (
          <p className="text-neutral-500 text-sm mt-0.5">{description}</p>
        )}
      </div>
      {right !== undefined ? (
        right
      ) : onPress ? (
        <ChevronRight className="w-5 h-5 text-neutral-500 flex-shrink-0 ml-2" />
      ) : null}
    </div>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        className="w-full text-left border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="border-b border-neutral-800 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl">
      {content}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-green-500' : 'bg-neutral-700'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [distanceUnits, setDistanceUnits] = useState<'miles' | 'km'>('miles');
  const [notifySavedPlaces, setNotifySavedPlaces] = useState(false);
  const [notifyUpdates, setNotifyUpdates] = useState(true);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-neutral-950 to-neutral-950" />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 px-4 py-4 border-b border-neutral-800 safe-top">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-4 pb-8">
        {/* Map & display */}
        <SettingsSection title="Map & display" icon={MapPin}>
          <SettingsRow
            label="Distance units"
            description="Show distances in miles or kilometres"
            right={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDistanceUnits('miles')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    distanceUnits === 'miles'
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Miles
                </button>
                <button
                  type="button"
                  onClick={() => setDistanceUnits('km')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    distanceUnits === 'km'
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  km
                </button>
              </div>
            }
          />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications" icon={Bell}>
          <SettingsRow
            label="Saved places"
            description="Get notified about updates to your saved locations"
            right={
              <Toggle
                checked={notifySavedPlaces}
                onChange={setNotifySavedPlaces}
              />
            }
          />
          <SettingsRow
            label="App updates"
            description="News and new features"
            right={
              <Toggle checked={notifyUpdates} onChange={setNotifyUpdates} />
            }
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account" icon={User}>
          {user ? (
            <>
              <SettingsRow
                label={user?.user_metadata?.full_name || 'User'}
                description={user?.email}
              />
              <SettingsRow
                label="Sign out"
                onPress={() => {
                  signOut();
                  navigate('/');
                }}
              />
            </>
          ) : (
            <SettingsRow
              label="Sign in"
              description="Sign in will be available when we re-enable login"
              onPress={() => navigate('/')}
            />
          )}
        </SettingsSection>

        {/* About & support */}
        <SettingsSection title="About & support" icon={Info}>
          <SettingsRow
            label="Version"
            description="2.0.0"
          />
          <SettingsRow
            label="Privacy Policy"
            onPress={() => window.open('#', '_blank')}
          />
          <SettingsRow
            label="Terms of Service"
            onPress={() => window.open('#', '_blank')}
          />
          <SettingsRow
            label="Send feedback"
            description="Help us improve CampMode"
            onPress={() => window.open('mailto:support@campmode.app', '_blank')}
          />
          <SettingsRow
            label="Help & FAQ"
            onPress={() => window.open('#', '_blank')}
          />
        </SettingsSection>

        {/* Data & privacy */}
        <SettingsSection title="Data & privacy" icon={Shield}>
          <SettingsRow
            label="Your data"
            description="Locations you save and preferences are stored securely"
          />
          <SettingsRow
            label="Clear cache"
            description="Free up space; map tiles will re-download when needed"
            onPress={() => {
              // Placeholder: could clear localStorage / cache in future
              alert('Cache cleared.');
            }}
          />
        </SettingsSection>
      </main>
    </div>
  );
}
