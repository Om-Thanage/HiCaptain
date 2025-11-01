'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = () => {
      // GitHub OAuth callback
      const githubConnected = searchParams.get('connected');
      const githubUsername = searchParams.get('username');
      const githubError = searchParams.get('error');
      
      // Google Calendar OAuth callback
      const googleAuth = searchParams.get('google_auth');
      
      if (githubConnected === 'true' && githubUsername) {
        toast.success(`GitHub connected successfully! Welcome ${githubUsername}`);
        router.push('/settings?tab=integrations');
      } else if (githubError) {
        const errorMessage = searchParams.get('message') || 'Failed to connect GitHub';
        toast.error(`GitHub connection failed: ${errorMessage}`);
        router.push('/settings?tab=integrations');
      } else if (googleAuth === 'success') {
        toast.success('Google Calendar connected successfully!');
        router.push('/settings?tab=integrations');
      } else if (googleAuth === 'error') {
        toast.error('Failed to connect Google Calendar');
        router.push('/settings?tab=integrations');
      } else {
        // No valid callback parameters, redirect to settings
        router.push('/settings');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
        <h2 className="text-xl font-semibold text-slate-100 mt-4">Processing OAuth...</h2>
        <p className="text-slate-400 mt-2">Please wait while we complete the authentication.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <h2 className="text-xl font-semibold text-slate-100 mt-4">Processing OAuth...</h2>
          <p className="text-slate-400 mt-2">Please wait while we complete the authentication.</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}