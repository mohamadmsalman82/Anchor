import { useState, useEffect } from 'react';
import { ProfileResponse } from '@/lib/types';
import { getProfile } from '@/lib/apiClient';

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const result = await getProfile(userId);
        setProfile(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  return { profile, loading, error };
}

