'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/auth';

export default function SocialAuthCallbackPage() {
  const router = useRouter();
  const setToken = useAuthStore(state => state.setToken);
  const started = useRef(false);
  const [ticket, setTicket] = useState('');
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  async function finish(value: string, organization?: string) {
    setBusy(true);
    try {
      const session = await authService.socialExchange(value, organization);
      authService.setToken(session.token);
      setToken(session.token);
      router.replace('/dashboard');
    } catch {
      setError('Could not finish sign-in. Please try again.');
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const message = new URLSearchParams(window.location.search).get('error');
    const value = new URLSearchParams(window.location.hash.slice(1)).get('ticket');
    window.history.replaceState(null, '', '/auth/oauth/callback');
    if (message || !value) {
      setError(message || 'The sign-in link is missing. Please try again.');
      setBusy(false);
      return;
    }
    setTicket(value);
    authService.socialTicket(value).then(result => {
      if (result.needsOrganization) {
        setProfile({ name: result.name, email: result.email });
        setBusy(false);
      } else finish(value);
    }).catch(() => {
      setError('The sign-in link has expired. Please try again.');
      setBusy(false);
    });
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (organizationName.trim()) finish(ticket, organizationName.trim());
  }

  return <div className="hc-auth"><div className="hc-auth-nav"><Link href="/" className="hc-brand"><span className="hc-brand-mark">✦</span>HiCaptain<span className="hc-brand-dot">.</span></Link></div>
    <div className="hc-auth-stage"><div className="hc-auth-story"><div><span className="hc-eyebrow">✦ YOUR WORKSPACE</span><h1>Good work starts together.</h1><p>Bring your projects and people into one clear space.</p></div></div>
      <div className="hc-auth-form-wrap"><div className="hc-auth-panel">
        {error ? <><h2>Sign-in didn&apos;t finish</h2><p>{error}</p><Link className="hc-pill-button dark" href="/auth?mode=login">Back to sign in</Link></> :
          profile ? <><h2>Set up your organization</h2><p>Welcome, {profile.name}. Create a workspace for {profile.email}. You&apos;ll be its admin.</p>
            <form onSubmit={submit} className="space-y-4 mt-6"><label className="block text-sm font-medium" htmlFor="social-organization">Organization name</label><input id="social-organization" className="w-full px-3 py-2" required maxLength={80} value={organizationName} onChange={event => setOrganizationName(event.target.value)} placeholder="Your team or company" /><button className="w-full" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create organization'}</button></form></> :
          <><h2>Finishing sign-in…</h2><p>We&apos;re opening your workspace.</p></>}
      </div></div>
    </div>
  </div>;
}
