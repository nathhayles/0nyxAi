import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { PlayCircle as Youtube, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? '';

export default function YouTubeConnect({ token }) {
  const [status, setStatus]     = useState(null);   // null | 'loading' | 'connected' | 'disconnected'
  const [channel, setChannel]   = useState(null);
  const [working, setWorking]   = useState(false);

  useEffect(() => {
    // Check ?youtube= query param from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const ytParam = params.get('youtube');
    if (ytParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setStatus('loading');
    try {
      const res = await fetch(`${API}/api/youtube/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatus(data.connected ? 'connected' : 'disconnected');
      if (data.connected) {
        setChannel({ name: data.channelName, thumb: data.channelThumb });
      }
    } catch {
      setStatus('disconnected');
    }
  }

  async function handleConnect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert('Not logged in');
    window.location.href = `${API}/api/auth/youtube?userId=${user.id}`;
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect YouTube? You can reconnect any time.')) return;
    setWorking(true);
    try {
      await fetch(`${API}/api/auth/youtube/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus('disconnected');
      setChannel(null);
    } catch {
      alert('Failed to disconnect. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="yt-connect-card">
      <div className="yt-connect-header">
        <Youtube size={22} className="yt-icon" />
        <span className="yt-label">YouTube</span>
        {status === 'connected' && (
          <span className="yt-badge connected">
            <CheckCircle2 size={13} /> Connected
          </span>
        )}
        {status === 'disconnected' && (
          <span className="yt-badge disconnected">
            <XCircle size={13} /> Not connected
          </span>
        )}
        {status === 'loading' && (
          <span className="yt-badge loading">
            <Loader2 size={13} className="spin" /> Checking…
          </span>
        )}
      </div>

      {status === 'connected' && channel?.name && (
        <div className="yt-channel-info">
          {channel.thumb && <img src={channel.thumb} alt="" className="yt-thumb" />}
          <span className="yt-channel-name">{channel.name}</span>
        </div>
      )}

      <div className="yt-connect-actions">
        {status === 'connected' ? (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDisconnect}
            disabled={working}
          >
            {working ? <Loader2 size={14} className="spin" /> : 'Disconnect'}
          </button>
        ) : (
          <button
            className="btn btn-red btn-sm"
            onClick={handleConnect}
            disabled={status === 'loading'}
          >
            <Youtube size={14} />
            Connect YouTube
          </button>
        )}
      </div>

      <style>{`
        .yt-connect-card {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .yt-connect-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .yt-icon { color: #FF0000; }
        .yt-label { font-weight: 600; font-size: 15px; color: #fff; flex: 1; }
        .yt-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .yt-badge.connected    { background: #0f2a1a; color: #4ade80; }
        .yt-badge.disconnected { background: #2a1a1a; color: #f87171; }
        .yt-badge.loading      { background: #1a1a2a; color: #a78bfa; }
        .yt-channel-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .yt-thumb {
          width: 28px; height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }
        .yt-channel-name { font-size: 13px; color: #aaa; }
        .yt-connect-actions { display: flex; gap: 8px; }
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s;
        }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-red { background: #FF0000; color: #fff; }
        .btn-red:hover:not(:disabled) { opacity: 0.85; }
        .btn-ghost { background: #2a2a2a; color: #aaa; }
        .btn-ghost:hover:not(:disabled) { background: #333; color: #fff; }
        .btn-sm { padding: 5px 12px; font-size: 12px; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
