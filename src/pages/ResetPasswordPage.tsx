import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Tent, Lock, Loader2 } from 'lucide-react';

/** Check if the URL hash indicates a password recovery flow (Supabase puts type=recovery in the hash). */
function isRecoveryHash(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    return params.get('type') === 'recovery';
  } catch {
    return false;
  }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState<boolean | null>(null);

  useEffect(() => {
    setIsRecovery(isRecoveryHash());
  }, []);

  useEffect(() => {
    if (isRecovery === false) {
      navigate('/login', { replace: true });
    }
  }, [isRecovery, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess(true);
    window.history.replaceState(null, '', window.location.pathname);
    setTimeout(() => navigate('/', { replace: true }), 1500);
  };

  if (isRecovery === null) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!isRecovery) return null;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-neutral-950 to-neutral-950" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 mb-6 shadow-lg shadow-green-500/20">
            <Tent className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Set new password</h1>
          <p className="text-neutral-400">
            Enter your new password below. You’ll stay signed in after this.
          </p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
            <p className="text-green-400 text-sm">Password updated. Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-neutral-400 mb-1">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-neutral-400 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  id="reset-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-colors"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Update password'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-neutral-500 text-sm mt-6">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-green-500 hover:text-green-400 underline"
          >
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
}
