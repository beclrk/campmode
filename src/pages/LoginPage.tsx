import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Tent, Mail, Loader2, Lock, ArrowLeft } from 'lucide-react';

type Mode = 'choose' | 'signin' | 'signup-email' | 'signup-password';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const resetState = location.state as { message?: string; email?: string } | null;
  const [mode, setMode] = useState<Mode>(() => (resetState?.message && resetState?.email ? 'signin' : 'choose'));
  const [email, setEmail] = useState(() => resetState?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(() => resetState?.message ?? null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
  };

  const setAuthError = (err: string | null, context?: 'signin' | 'signup' | 'forgot') => {
    if (!err) {
      setError(null);
      return;
    }
    const lower = err.toLowerCase();
    const isRateLimit = lower.includes('rate limit') || lower.includes('rate_limit') || lower.includes('too many');
    if (isRateLimit) {
      if (context === 'signin') {
        setError('Our auth provider is temporarily limiting requests (often after several sign-ups or password-reset emails). Sign-in with password does not send email—please wait 15–60 minutes and try again.');
        return;
      }
      if (context === 'signup') {
        setError('Too many sign-ups right now (email limit reached). Wait an hour or log in below if you already have an account.');
        return;
      }
      if (context === 'forgot') {
        setError('Too many password-reset emails. Please wait at least an hour before requesting another.');
        return;
      }
      setError('Too many attempts. Please wait 15–60 minutes and try again.');
      return;
    }
    setError(err);
  };

  // Sign in with Apple (unchanged)
  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
    setLoading(false);
  };

  // Sign in with email + password (returning users) — does NOT send email
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message, 'signin');
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate(from || '/', { replace: true });
  };

  // Step 1: Enter email for sign-up
  const handleSignUpEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    setMode('signup-password');
  };

  // Step 2: Create password and sign up
  const handleSignUp = async (e: React.FormEvent) => {
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message, 'signup');
      setLoading(false);
      return;
    }
    setLoading(false);
    if (data?.user && !data.user.identities?.length) {
      setError('An account with this email already exists. Try logging in instead.');
      return;
    }
    setMessage(
      'Account created. Check your email to confirm your address, then you can log in with your email and password.'
    );
  };

  // Forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email first');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`, // Add this URL to Supabase Auth → URL Configuration → Redirect URLs
    });
    if (error) setAuthError(error.message, 'forgot');
    else setMessage('Check your email for a link to reset your password.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-neutral-950 to-neutral-950" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 to-green-600 mb-6 shadow-lg shadow-green-500/20">
            <Tent className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CampMode</h1>
          <p className="text-neutral-400">
            Discover campsites, EV chargers & rest stops across the UK
          </p>
        </div>

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-4 text-center">
            <p className="text-green-400 text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            {error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('too many') ? (
              <p className="text-neutral-500 text-xs mt-2">
                Tip: In Supabase Dashboard → Auth → Providers → Email, turn off &quot;Confirm email&quot; so new sign-ups don&apos;t send email and won&apos;t hit this limit.
              </p>
            ) : null}
          </div>
        )}

        {/* Choose: Log in vs Sign up */}
        {mode === 'choose' && (
          <div className="space-y-4">
            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-100 text-black font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-neutral-950 text-neutral-500">or</span>
              </div>
            </div>

            <button
              onClick={() => { resetForm(); setMode('signin'); }}
              className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              <Mail className="w-5 h-5" />
              Log in with email
            </button>
            <button
              onClick={() => { resetForm(); setMode('signup-email'); }}
              className="w-full flex items-center justify-center gap-2 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              Create an account
            </button>
          </div>
        )}

        {/* Sign in: email + password */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <button
              type="button"
              onClick={() => { resetForm(); setMode('choose'); }}
              className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-4 px-4 text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-4 px-4 text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log in'}
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-neutral-400 hover:text-green-500 text-sm"
            >
              Forgot password?
            </button>
          </form>
        )}

        {/* Sign up step 1: email */}
        {mode === 'signup-email' && (
          <form onSubmit={handleSignUpEmail} className="space-y-4">
            <button
              type="button"
              onClick={() => { resetForm(); setMode('choose'); }}
              className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-4 px-4 text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </form>
        )}

        {/* Sign up step 2: create password */}
        {mode === 'signup-password' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('signup-email')}
              className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl py-3 px-4 text-neutral-400 text-sm mb-2">
              {email}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 6 characters)"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-4 px-4 text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-4 px-4 text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Lock className="w-5 h-5" />
                  Create account
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-neutral-500 text-xs mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-neutral-400 hover:text-white">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-neutral-400 hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
