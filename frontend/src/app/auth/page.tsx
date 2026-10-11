'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Login from './components/Login';
import Register from './components/Register';

function AuthContent() {
  const mode = useSearchParams().get('mode');
  return (
    <div className="hc-auth">
      <div className="hc-auth-nav"><Link href="/" className="hc-brand"><span className="hc-brand-mark">✦</span>HiCaptain<span className="hc-brand-dot">.</span></Link><Link href="/" className="hc-pill-button outline">Back to home</Link></div>
      <div className="hc-auth-stage">
        <div className="hc-auth-story"><div><span className="hc-eyebrow">✦ YOUR SPACE TO DO GREAT WORK</span><h1>A clearer way to work together.</h1><p>Keep projects moving, conversations close, and your whole team in the loop.</p></div><div className="hc-auth-story-art"><strong>Today’s momentum ✨</strong><span>✓ Project planning is complete</span><span>↗ Your team is making progress</span><span>● Next milestone is in view</span></div></div>
        <div className="hc-auth-form-wrap"><div className="hc-auth-panel">{mode === 'login' ? <Login /> : <Register />}</div></div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<div className="hc-loading">Loading…</div>}><AuthContent /></Suspense>;
}
