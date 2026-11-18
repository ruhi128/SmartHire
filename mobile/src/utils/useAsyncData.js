import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { DEMO_MODE } from '../config/runtime';
import { withDeadline } from './withDeadline';

const SCREEN_LOAD_DEADLINE_MS = 25000;

export default function useAsyncData(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  const load = useCallback(async ({ refresh = false } = {}) => {
    const requestId = ++latestRequest.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const timeoutMessage = DEMO_MODE
        ? 'This page did not finish loading. Please try again.'
        : apiErrorMessage({ code: 'ETIMEDOUT' });
      const next = await withDeadline(loader, SCREEN_LOAD_DEADLINE_MS, timeoutMessage);
      // Late responses must not replace a retry, another item, or an unmounted
      // screen. The deadline is independent of React Native's HTTP adapter.
      if (latestRequest.current === requestId) {
        setData(next);
        setError(null);
      }
      return next;
    } catch (err) {
      if (latestRequest.current === requestId) setError(apiErrorMessage(err));
      throw err;
    } finally {
      if (latestRequest.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load().catch(() => {});
    return () => { latestRequest.current += 1; };
  }, [load]);

  return { data, setData, loading, refreshing, error, reload: load };
}
