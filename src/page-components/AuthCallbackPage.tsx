import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          navigate('/login?error=' + encodeURIComponent(errorDescription || errorParam), { replace: true });
          return;
        }

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setError(exchangeError.message);
            setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 2000);
            return;
          }
          if (data.session) {
            navigate('/dashboard', { replace: true });
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard', { replace: true });
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            subscription.unsubscribe();
            navigate('/dashboard', { replace: true });
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          navigate('/login?error=timeout', { replace: true });
        }, 10000);

      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An unexpected error occurred');
        setTimeout(() => navigate('/login?error=unexpected', { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-600 text-xl mb-2">Sign-in failed</div>
            <p className="text-gray-600">{error}</p>
            <p className="text-gray-400 text-sm mt-2">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto mb-4" />
            <p className="text-gray-600">Completing sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
}
