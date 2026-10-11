import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../api/client';

export default function useAsyncData(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const next = await loader();
      setData(next);
      setError(null);
      return next;
    } catch (err) {
      setError(apiErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load().catch(() => {}); }, [load]);

  return { data, setData, loading, refreshing, error, reload: load };
}
