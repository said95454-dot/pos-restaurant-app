// Realtime WebSocket hook — connects on auth and dispatches DOM events
// for the rest of the app to consume. Single shared connection per session.

import { useEffect, useRef, useState, useCallback } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Convert https://host → wss://host, http→ws
const toWsUrl = (httpUrl) => httpUrl.replace(/^http/i, 'ws');

let sharedWs = null;
let sharedSubs = 0;

export const useRealtime = () => {
  const [connected, setConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const pingTimer = useRef(null);
  const closedByUs = useRef(false);

  const dispatch = (type, data) => {
    try { window.dispatchEvent(new CustomEvent(`realtime:${type}`, { detail: data })); } catch { /* noop */ }
  };

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
    closedByUs.current = false;
    const url = `${toWsUrl(BACKEND_URL)}/api/ws?token=${encodeURIComponent(token)}`;
    let ws;
    try { ws = new WebSocket(url); } catch { return; }
    wsRef.current = ws;
    sharedWs = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      // ping every 25s to keep proxies from idling us out
      if (pingTimer.current) clearInterval(pingTimer.current);
      pingTimer.current = setInterval(() => {
        try { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); } catch { /* noop */ }
      }, 25000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'presence') {
          setPresenceCount(msg.count || 0);
          dispatch('presence', { count: msg.count || 0 });
          return;
        }
        if (msg.type === 'pong') return;
        dispatch(msg.type, msg.data || {});
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (closedByUs.current) return;
      // Exponential backoff up to 30s
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts.current));
      reconnectAttempts.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
  }, []);

  useEffect(() => {
    sharedSubs += 1;
    if (sharedSubs === 1) connect();
    return () => {
      sharedSubs -= 1;
      if (sharedSubs === 0) {
        closedByUs.current = true;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        if (pingTimer.current) clearInterval(pingTimer.current);
        try { sharedWs && sharedWs.close(); } catch { /* noop */ }
        sharedWs = null;
      }
    };
  }, [connect]);

  return { connected, presenceCount };
};

// Helper to subscribe to a single realtime event type
export const onRealtime = (eventType, handler) => {
  const wrapped = (e) => handler(e.detail);
  window.addEventListener(`realtime:${eventType}`, wrapped);
  return () => window.removeEventListener(`realtime:${eventType}`, wrapped);
};
