import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

// ---------- Singleton presence manager ----------
let _channel = null;
let _count = 0;
const _listeners = new Set();

function notify() {
  _listeners.forEach((fn) => fn(_count));
}

/** Call once per authenticated user (e.g. in App.jsx) */
export function useTrackPresence(userId) {
  useEffect(() => {
    if (!userId) return;
    // Only one channel instance across the whole app
    if (_channel) return;

    try {
      _channel = supabase.channel('online-users', {
        config: { presence: { key: userId } },
      });

      _channel
        .on('presence', { event: 'sync' }, () => {
          _count = Object.keys(_channel.presenceState()).length;
          notify();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await _channel.track({ user_id: userId, t: Date.now() });
          }
        });
    } catch (err) {
      console.error('Presence track error:', err);
    }

    return () => {
      if (_channel) {
        supabase.removeChannel(_channel);
        _channel = null;
        _count = 0;
        notify();
      }
    };
  }, [userId]);
}

/** Read-only hook — subscribes to the shared count */
export function useOnlineUsers() {
  const [count, setCount] = useState(_count);

  useEffect(() => {
    const handler = (c) => setCount(c);
    _listeners.add(handler);
    handler(_count); // sync immediately
    return () => _listeners.delete(handler);
  }, []);

  return count;
}
