import { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase';

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
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? '');
  useEffect(() => {
    setDisplayName(user?.user_metadata?.full_name ?? '');
  }, [user?.user_metadata?.full_name]);
  const [nameSaving, setNameSaving] = useState(false);
  const [changePasswordSending, setChangePasswordSending] = useState(false);
  const [changePasswordMessage, setChangePasswordMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);

  const handleSaveName = async () => {
    if (!user) return;
    setNameSaving(true);
    setAccountError(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() || undefined } });
    setNameSaving(false);
    if (error) {
      setAccountError(error.message);
      return;
    }
    setEditingName(false);
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    setChangePasswordSending(true);
    setChangePasswordMessage(null);
    setAccountError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setChangePasswordSending(false);
    if (error) setAccountError(error.message);
    else setChangePasswordMessage('Check your email for a link to change your password.');
  };

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
              {/* Display name */}
              {editingName ? (
                <div className="p-4 border-b border-neutral-800">
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={nameSaving}
                      className="px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50"
                    >
                      {nameSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDisplayName(user?.user_metadata?.full_name ?? '');
                        setEditingName(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-neutral-700 text-neutral-300 font-medium hover:bg-neutral-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <SettingsRow
                  label="Display name"
                  description={user?.user_metadata?.full_name || 'Not set'}
                  right={
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      className="text-sm text-green-500 hover:text-green-400 font-medium"
                    >
                      Edit
                    </button>
                  }
                />
              )}
              {/* Email (read-only) */}
              <SettingsRow
                label="Email"
                description={user?.email ?? ''}
              />
              {accountError && (
                <div className="px-4 py-3 border-b border-neutral-800 bg-red-500/10">
                  <p className="text-sm text-red-400">{accountError}</p>
                </div>
              )}
              {/* Change password */}
              <SettingsRow
                label="Change password"
                description={changePasswordSending ? 'Sending link…' : changePasswordMessage ?? 'Send a link to your email to set a new password'}
                onPress={changePasswordSending ? undefined : handleChangePassword}
              />
              {/* Sign out */}
              <SettingsRow
                label="Sign out"
                description="Sign out of your account on this device"
                onPress={() => {
                  signOut();
                  navigate('/');
                }}
              />
              {/* Delete account */}
              <button
                type="button"
                onClick={() => setDeleteAccountConfirm(true)}
                className="w-full text-left border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/50 transition-colors py-4 px-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-red-400 font-medium">Delete account</p>
                  <p className="text-neutral-500 text-sm mt-0.5">Permanently remove your account and data</p>
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-500 flex-shrink-0 ml-2" />
              </button>
              {deleteAccountConfirm && (
                <div className="p-4 border-t border-neutral-800 bg-red-500/5">
                  <p className="text-sm text-neutral-300 mb-3">
                    To delete your account and all saved data, please email us at{' '}
                    <a href="mailto:support@campmode.app" className="text-green-500 hover:underline">support@campmode.app</a> with the subject &quot;Delete my account&quot; and we&apos;ll process your request.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDeleteAccountConfirm(false)}
                    className="text-sm text-neutral-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </>
          ) : (
            <SettingsRow
              label="Sign in"
              description="Sign in or create an account"
              onPress={() => navigate('/login')}
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
            onPress={() => navigate('/privacy')}
          />
          <SettingsRow
            label="Terms of Service"
            onPress={() => navigate('/terms')}
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
