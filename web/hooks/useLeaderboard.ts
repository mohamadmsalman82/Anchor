import { useState, useEffect } from 'react';
import { LeaderboardResponse } from '@/lib/types';
import { getLeaderboard } from '@/lib/apiClient';

export function useLeaderboard(range: 'weekly' | 'all_time' = 'weekly') {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const result = await getLeaderboard(range);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [range]);

  return { data, loading, error };
}

