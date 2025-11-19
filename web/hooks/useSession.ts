import { useState, useEffect } from 'react';
import { Session } from '@/lib/types';
import { getSession } from '@/lib/apiClient';

export function useSession(sessionId: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const result = await getSession(sessionId);
        setSession(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sessionId]);

  const mutate = (newSession: Session | null, shouldRevalidate = true) => {
    setSession(newSession);
    if (shouldRevalidate && newSession) {
      // Optionally refetch to ensure consistency
      getSession(sessionId).then(setSession).catch(() => {});
    }
  };

  return { session, loading, error, mutate };
}

