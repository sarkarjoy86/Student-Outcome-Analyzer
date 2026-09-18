import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService, setMLReadyState, isMLReady } from '../services/apiService';

// Render free tier spins down after 15 minutes of inactivity.
// We ping every 9 minutes during active editing sessions.
const HEARTBEAT_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes

// Idle inactivity threshold: 5 minutes without mouse click, typing, or scrolling.
// If idle for >= 5 minutes, heartbeats pause so Render can sleep (Total idle-to-sleep <= 20 min).
const IDLE_INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Activity event throttle: update timestamp at most once every 15 seconds to ensure 0% CPU impact.
const ACTIVITY_THROTTLE_MS = 15 * 1000; // 15 seconds

// Absolute maximum session duration before disengaging keep-alive to preserve free-tier quotas.
const MAX_SESSION_DURATION_MS = 90 * 60 * 1000; // 90 minutes (1.5 hours)

/**
 * Custom React hook for JIT ML service pre-warming and strictly scoped keep-alive heartbeats
 * with zero-overhead user activity detection (click, typing, scroll) and tab visibility tracking.
 * 
 * @param {object} options
 * @param {boolean} [options.isEditingSession=false] - Whether Question Paper Editor is currently open
 * @param {boolean} [options.autoWarm=false] - Whether to automatically trigger JIT wake-up on mount
 * @param {function} [options.onStatusChange] - Optional callback when ML service status transitions
 * @param {function} [options.onIdleChange] - Optional callback when user enters/exits idle state (>= 5 mins)
 * @param {function} [options.onVisibilityChange] - Optional callback when tab visibility changes
 */
export function useMLServiceWakeup(options = {}) {
  const {
    isEditingSession = false,
    autoWarm = false,
    onStatusChange = null,
    onIdleChange = null,
    onVisibilityChange = null
  } = options;

  const [status, setStatus] = useState('idle'); // 'idle' | 'warming' | 'ready' | 'offline'
  const [isIdle, setIsIdle] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [error, setError] = useState(null);

  const heartbeatTimerRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const isWakingRef = useRef(false);
  const isMountedRef = useRef(true);

  // User presence & activity tracking refs
  const lastActivityRef = useRef(Date.now());
  const lastThrottleWriteRef = useRef(0);
  const lastHeartbeatTimeRef = useRef(0);

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
   * Direct clean wake-up trigger.
   * Mirrors a browser tab click: sends a single persistent GET request to the ML service /health.
   * Reuses the shared singleton promise so no duplicate or aborted requests occur.
   */
  const wakeUp = useCallback(async (wakeOptions = { silent: true }) => {
    if (status === 'ready') return { online: true, status: 'ready' };

    if (!wakeOptions.silent) {
      updateStatus('warming');
    }

    try {
      const res = await apiService.ensureMLReady({
        timeoutMs: wakeOptions.timeoutMs || 50000,
        onProgress: wakeOptions.onProgress || null
      });

      if (!isMountedRef.current) return res;

      if (res && res.online) {
        updateStatus('ready');
        return res;
      }
      return res;
    } catch (err) {
      if (isMountedRef.current) {
        console.warn('[useMLServiceWakeup] Wake ping notice:', err.message);
        updateStatus('warming', err.message);
      }
      if (wakeOptions.waitForReady) {
        throw err;
      }
      return { online: false, status: 'warming' };
    }
  }, [status, updateStatus]);

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
        const now = Date.now();
        setLastHeartbeat(now);
        lastHeartbeatTimeRef.current = now;
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

  // Strictly Scoped Session Keep-Alive Heartbeat with Activity & Tab Visibility Tracking
  useEffect(() => {
    // If not an active editing session, do not run heartbeat or track activity
    if (!isEditingSession) {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    sessionStartRef.current = Date.now();
    lastActivityRef.current = Date.now();
    lastThrottleWriteRef.current = Date.now();
    lastHeartbeatTimeRef.current = Date.now();

    // Initial wake-up on entering editing session
    wakeUp({ silent: true });

    // Activity tracking handler (passive + throttled for 0% CPU impact)
    const recordActivity = () => {
      const now = Date.now();
      const wasIdle = (now - lastActivityRef.current) >= IDLE_INACTIVITY_THRESHOLD_MS;

      if (now - lastThrottleWriteRef.current > ACTIVITY_THROTTLE_MS) {
        lastThrottleWriteRef.current = now;
        lastActivityRef.current = now;

        if (wasIdle) {
          setIsIdle(false);
          if (onIdleChange) {
            try { onIdleChange(false); } catch (e) {}
          }

          // If user returned after 12+ minutes of dormancy, Render container has spun down to sleep
          const timeSinceLastHeartbeat = now - lastHeartbeatTimeRef.current;
          if (timeSinceLastHeartbeat >= 12 * 60 * 1000) {
            setMLReadyState(false);
            updateStatus('idle');
          } else if (document.visibilityState === 'visible' && timeSinceLastHeartbeat >= 8 * 60 * 1000) {
            pingHeartbeat();
          }
        }
      }
    };

    // Attach passive capture listeners for clicks, typing, and scrolling
    const activityEvents = ['pointerdown', 'keydown', 'scroll', 'wheel'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, recordActivity, { passive: true, capture: true });
      document.addEventListener(evt, recordActivity, { passive: true, capture: true });
    });

    // High-frequency (15s) non-blocking idle presence & sleep state detector
    const idleCheckInterval = setInterval(() => {
      const now = Date.now();
      const idleElapsed = now - lastActivityRef.current;
      const isCurrentlyIdle = idleElapsed >= IDLE_INACTIVITY_THRESHOLD_MS;

      setIsIdle(prev => {
        if (prev !== isCurrentlyIdle) {
          if (onIdleChange) {
            try { onIdleChange(isCurrentlyIdle); } catch (e) {}
          }
        }
        return isCurrentlyIdle;
      });

      // If user has been idle for >= 12 minutes (or no heartbeat in >= 12 mins),
      // the Render container has entered or is entering sleep mode.
      // Invalidate confirmed ready state so next AI interaction prompts pre-warming.
      const timeSinceLastHeartbeat = now - lastHeartbeatTimeRef.current;
      if (timeSinceLastHeartbeat >= 12 * 60 * 1000) {
        setMLReadyState(false);
        if (status === 'ready') {
          updateStatus('idle');
        }
      }
    }, 15000);

    // Establish periodic keep-alive interval (runs every 9 minutes during active work)
    heartbeatTimerRef.current = setInterval(() => {
      const now = Date.now();
      const idleElapsed = now - lastActivityRef.current;
      const isTabHidden = document.visibilityState === 'hidden';

      // 1. If tab is in background (e.g. YouTube), pause heartbeats to save hours
      if (isTabHidden) {
        return;
      }

      // 2. If user has been inactive (no clicks, keys, scroll) for >= 5 minutes, pause heartbeats.
      // Render will sleep 15 mins after the last poke, keeping total idle-to-sleep <= 20 mins.
      if (idleElapsed >= IDLE_INACTIVITY_THRESHOLD_MS) {
        return;
      }

      // 3. User is actively editing in QuestionPaperEditor, dispatch heartbeat poke!
      pingHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Tab visibility handling: pause heartbeat when backgrounded, resume when user returns
    const handleVisibilityChange = () => {
      const currentVisibility = document.visibilityState;
      if (onVisibilityChange) {
        try { onVisibilityChange(currentVisibility); } catch (e) {}
      }

      if (currentVisibility === 'visible') {
        const now = Date.now();
        lastActivityRef.current = now;
        lastThrottleWriteRef.current = now;
        setIsIdle(false);
        if (onIdleChange) {
          try { onIdleChange(false); } catch (e) {}
        }

        const sessionElapsed = now - sessionStartRef.current;
        if (sessionElapsed <= MAX_SESSION_DURATION_MS) {
          const timeSinceLastHeartbeat = now - lastHeartbeatTimeRef.current;
          if (timeSinceLastHeartbeat >= 12 * 60 * 1000) {
            // Container slept while away: invalidate ready cache
            setMLReadyState(false);
            updateStatus('idle');
          } else if (timeSinceLastHeartbeat >= 8 * 60 * 1000) {
            pingHeartbeat();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // CRITICAL: Cleanup function guarantees zero unbounded pings and removes all listeners
    // immediately when leaving QuestionPaperEditor
    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      clearInterval(idleCheckInterval);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, recordActivity, { capture: true });
        document.removeEventListener(evt, recordActivity, { capture: true });
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEditingSession, wakeUp, pingHeartbeat, onIdleChange, onVisibilityChange, status, updateStatus]);

  return {
    status,
    isWarming: status === 'warming',
    isReady: status === 'ready',
    isOffline: status === 'offline',
    isIdle,
    isUserIdle: isIdle,
    lastHeartbeat,
    error,
    wakeUp,
    checkStatus,
    pingHeartbeat
  };
}

export default useMLServiceWakeup;
