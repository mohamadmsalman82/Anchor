import { useState, useEffect, useCallback } from 'react';
import { Session } from '@/lib/types';
import { getFeed } from '@/lib/apiClient';

export function useFeed() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const result = await getFeed(20, offset);
      if (result.sessions.length === 0) {
        setHasMore(false);
      } else {
        setSessions(prev => [...prev, ...result.sessions]);
        setOffset(prev => prev + result.sessions.length);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [offset, loading, hasMore]);

  useEffect(() => {
    loadMore();
  }, []); // Initial load

  return { sessions, loading, error, hasMore, loadMore };
}

