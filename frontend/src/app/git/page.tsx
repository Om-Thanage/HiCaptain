'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// GitHub OAuth returns here; restore the project that started the connection.
export default function GitCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const projectId = sessionStorage.getItem('hicaptain-github-project');
    sessionStorage.removeItem('hicaptain-github-project');
    const destination = projectId ? `/projects/${encodeURIComponent(projectId)}` : '/projects';
    router.replace(destination + window.location.search);
  }, [router]);

  return <p style={{ padding: 32 }}>Returning to your project…</p>;
}
