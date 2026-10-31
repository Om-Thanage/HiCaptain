'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth';
import { Invitation, organizationService } from '@/services/organization';
import { useAuthStore } from '@/store/auth';
import SocialSignIn from '@/app/auth/components/SocialSignIn';

function InvitationPage() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const setToken = useAuthStore(state => state.setToken);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const signedIn = !!authService.getToken();

  useEffect(() => {
    if (!token) { setError('Invitation link is missing its token.'); return; }
    organizationService.preview(token).then(setInvitation).catch(() => setError('This invitation is invalid, expired, or already used.'));
  }, [token]);

  async function accept() {
    if (!invitation) return;
    setBusy(true);
    try {
      const session = signedIn
        ? await organizationService.accept(token)
        : await organizationService.registerInvited(token, invitation.email, password);
      authService.setToken(session.token);
      setToken(session.token);
      toast.success(`Joined ${invitation.organizationName}`);
      router.push('/dashboard');
    } catch (cause: any) {
      setError(cause.response?.data?.detail || cause.response?.data?.message || 'Could not accept invitation.');
    } finally { setBusy(false); }
  }

  return <div className="hc-auth"><div className="hc-auth-nav"><Link href="/" className="hc-brand">✦ HiCaptain.</Link></div>
    <div className="hc-auth-stage"><div className="hc-auth-story"><div><span className="hc-eyebrow">✦ YOU'RE INVITED</span><h1>Better work starts together.</h1><p>Join your team and get everything in one place.</p></div></div>
      <div className="hc-auth-form-wrap"><div className="hc-auth-panel space-y-5 text-white">
        <h2 className="text-2xl font-semibold">Join {invitation?.organizationName || 'your team'}</h2>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        {invitation && <><p className="text-slate-300">Invited as {invitation.email} · {invitation.roles.join(', ')}</p>
          {!signedIn && <label className="block text-sm">Password<input type="password" minLength={8} className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 p-3" value={password} onChange={e => setPassword(e.target.value)} /></label>}
          <button className="hc-pill-button w-full" disabled={busy || (!signedIn && password.length < 8)} onClick={accept}>{busy ? 'Joining…' : 'Accept invitation'}</button>
          {!signedIn && <SocialSignIn invitation={token} />}
          {signedIn && <p className="text-sm text-slate-400">Signed in with another account? <button className="underline" onClick={() => { authService.clearToken(); setToken(null); window.location.reload(); }}>Sign out</button> to accept with the invited email.</p>}
        </>}
      </div></div></div></div>;
}

export default function Page() { return <Suspense fallback={<div className="hc-loading">Opening invitation…</div>}><InvitationPage /></Suspense>; }
