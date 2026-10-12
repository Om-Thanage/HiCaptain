'use client';

import { Github } from 'lucide-react';
import { authService } from '@/services/auth';

export default function SocialSignIn({ invitation }: { invitation?: string }) {
  return <div className="hc-social-auth">
    <div className="hc-social-divider"><span>{invitation ? 'or join with' : 'or continue with'}</span></div>
    <div className="hc-social-buttons">
      <a href={authService.socialStartUrl('google', invitation)}><span className="hc-google-mark" aria-hidden="true">G</span> Google</a>
      <a href={authService.socialStartUrl('github', invitation)}><Github size={18} aria-hidden="true" /> GitHub</a>
    </div>
  </div>;
}
