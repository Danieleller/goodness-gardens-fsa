import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Mail, Phone, Chrome } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type AuthMode = 'options' | 'email' | 'phone' | 'phone-verify';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: 'goodnessgardens.net' },
      },
    });
    if (error) setError(error.message);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Verification code sent!');
        setMode('phone-verify');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });
      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <img src="/nobackgound-Goodness%20Gardens%20(630x630)%20(1).png" alt="Goodness Gardens" className="h-24 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            FSQA Management Portal
          </h1>
          <p className="text-center text-gray-600 mb-8">Sign in to your account</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{message}</p>
            </div>
          )}

          {mode === 'options' && (
            <div className="space-y-3">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <Chrome size={20} />
                Sign in with Google
              </button>

              <button
                onClick={() => { setMode('email'); setError(''); setMessage(''); }}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <Mail size={20} />
                Sign in with Email
              </button>

              <button
                onClick={() => { setMode('phone'); setError(''); setMessage(''); }}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <Phone size={20} />
                Sign in with Phone
              </button>
            </div>
          )}

          {mode === 'email' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-800 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('options'); setError(''); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700"
              >
                &larr; Back to sign-in options
              </button>
            </form>
          )}

          {mode === 'phone' && (
            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-800 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('options'); setError(''); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700"
              >
                &larr; Back to sign-in options
              </button>
            </form>
          )}

          {mode === 'phone-verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-800 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('phone'); setError(''); setMessage(''); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700"
              >
                &larr; Send a new code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
