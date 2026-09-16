import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';

// Render free tier spins down after 15 minutes of inactivity.
// We ping every 9 minutes during active editing sessions.
const HEARTBEAT_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes

// Absolute maximum session duration before disengaging keep-alive to preserve free-tier quotas.
const MAX_SESSION_DURATION_MS = 90 * 60 * 1000; // 90 minutes (1.5 hours)

/**
 * Custom React hook for JIT ML service pre-warming and strictly scoped keep-alive heartbeats.
 * 
 * @param {object} options
 * @param {boolean} [options.isEditingSession=false] - Whether Question Paper Editor is currently open
 * @param {boolean} [options.autoWarm=false] - Whether to automatically trigger JIT wake-up on mount
 * @param {function} [options.onStatusChange] - Optional callback when ML service status transitions
 */
export function useMLServiceWakeup(options = {}) {
  const { isEditingSession = false, autoWarm = false, onStatusChange = null } = options;

  const [status, setStatus] = useState('idle'); // 'idle' | 'warming' | 'ready' | 'offline'
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [error, setError] = useState(null);

  const heartbeatTimerRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const isWakingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Status transition helper with callback notification
  const updateStatus = useCallback((newStatus, err = null) => {
    if (!isMountedRef.current) return;
    setStatus(newStatus);
    if (err) setError(err);
    if (onStatusChange) {
      try {
        onStatusChange(newStatus, err);
      } catch (cbErr) {
        console.warn('[useMLServiceWakeup] onStatusChange error:', cbErr);
      }
    }
  }, [onStatusChange]);

  /**
   * JIT Silent background wake-up trigger
   */
  const wakeUp = useCallback(async (wakeOptions = { silent: true }) => {
    if (isWakingRef.current) return;
    isWakingRef.current = true;

    if (!wakeOptions.silent) {
      updateStatus('warming');
    }

    try {
      const res = await apiService.wakeMLService({
        waitForReady: wakeOptions.waitForReady === true
      });

      if (!isMountedRef.current) return;

      if (res && res.online) {
        updateStatus('ready');
      } else if (res && res.status === 'warming') {
        updateStatus('warming');
      } else {
        updateStatus('warming');
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.warn('[useMLServiceWakeup] Pre-warm ping notice:', err.message);
        // Do not set hard offline on background ping failures; treat as warming
        updateStatus('warming', err.message);
      }
    } finally {
      isWakingRef.current = false;
    }
  }, [updateStatus]);

  /**
   * Single heartbeat ping
   */
  const pingHeartbeat = useCallback(async () => {
    const sessionElapsed = Date.now() - sessionStartRef.current;
    if (sessionElapsed > MAX_SESSION_DURATION_MS) {
      console.warn('[useMLServiceWakeup] Keep-alive session reached 90-min quota threshold. Stopping heartbeat.');
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    try {
      const res = await apiService.sendMLHeartbeat();
      if (isMountedRef.current) {
        setLastHeartbeat(Date.now());
        if (res && res.online) {
          updateStatus('ready');
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.warn('[useMLServiceWakeup] Heartbeat warning:', err.message);
      }
    }
  }, [updateStatus]);

  /**
   * Check status on demand
   */
  const checkStatus = useCallback(async () => {
    try {
      const res = await apiService.getMLStatus(5000);
      if (isMountedRef.current) {
        if (res && res.online) {
          updateStatus('ready');
        } else if (res && res.status === 'warming') {
          updateStatus('warming');
        } else {
          updateStatus('offline');
        }
      }
      return res;
    } catch (err) {
      if (isMountedRef.current) {
        updateStatus('offline', err.message);
      }
      return { online: false, status: 'offline' };
    }
  }, [updateStatus]);

  // Handle autoWarm on mount
  useEffect(() => {
    isMountedRef.current = true;
    if (autoWarm) {
      wakeUp({ silent: true });
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [autoWarm, wakeUp]);

  // Strictly Scoped Session Keep-Alive Heartbeat
  useEffect(() => {
    // If not an active editing session, do not run heartbeat
    if (!isEditingSession) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    sessionStartRef.current = Date.now();

    // Initial wake-up on entering editing session
    wakeUp({ silent: true });

    // Establish periodic keep-alive interval
    heartbeatTimerRef.current = setInterval(() => {
      pingHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Tab visibility handling: pause heartbeat when backgrounded, ping when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const sessionElapsed = Date.now() - sessionStartRef.current;
        if (sessionElapsed <= MAX_SESSION_DURATION_MS) {
          pingHeartbeat();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // CRITICAL: Cleanup function guarantees zero unbounded pings when leaving QuestionPaperEditor
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEditingSession, wakeUp, pingHeartbeat]);

  return {
    status,
    isWarming: status === 'warming',
    isReady: status === 'ready',
    isOffline: status === 'offline',
    lastHeartbeat,
    error,
    wakeUp,
    checkStatus,
    pingHeartbeat
  };
}

export default useMLServiceWakeup;
