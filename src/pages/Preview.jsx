import { useParams } from "react-router-dom"
import { useEffect, useState, useRef } from "react"
import { supabase } from "../supabaseClient"

export default function Preview() {
  const { id } = useParams()
  const refParam = new URLSearchParams(window.location.search).get('ref') || '';
  const [videoSrc, setVideoSrc] = useState(null)
  const [authError, setAuthError] = useState(false)
  const intervalRef = useRef(null)
  const videoRef = useRef(null)

  // Decode the base64url id to recover the original URL. The encoders
  // (Dashboard.jsx, EditorV2.jsx) strip trailing "=" padding after
  // converting to base64url charset -- atob() requires the padded form and
  // throws "Incorrect padding" without it, which happens for roughly 2 out
  // of every 3 real URL lengths (only byte lengths that are a multiple of 3
  // encode padding-free). That throw was silently caught here and treated
  // as "not a public URL", falling through to the auth-required token path
  // -- forcing sign-in on the majority of real share links instead of the
  // intended public playback. Restore the padding before decoding.
  function decodeId(raw) {
    try {
      const charsetFixed = raw.replace(/-/g, '+').replace(/_/g, '/')
      const padded = charsetFixed + '='.repeat((4 - (charsetFixed.length % 4)) % 4)
      return atob(padded)
    } catch { return null }
  }

  async function fetchToken() {
    const { data: { session } } = await supabase.auth.getSession()
    const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {}
    const res = await fetch(`/api/stream/token/${id}`, { headers })
    if (!res.ok) throw new Error("auth")
    const { token } = await res.json()
    return token
  }

  async function refreshToken() {
    try {
      const token = await fetchToken()
      const newSrc = `/api/stream/${id}?token=${token}`
      // Preserve playback position across token refresh
      const video = videoRef.current
      if (video && !video.paused) {
        const t = video.currentTime
        video.src = newSrc
        video.currentTime = t
        video.play().catch(() => {})
      } else {
        setVideoSrc(newSrc)
      }
    } catch {
      // Silently swallow refresh failures — current token still valid for a few more seconds
    }
  }

  useEffect(() => {
    let cancelled = false

    const decoded = decodeId(id)
    // R2 renders are public URLs — use them directly, no stream proxy needed
    if (decoded && /^https?:\/\//i.test(decoded)) {
      if (!cancelled) setVideoSrc(decoded)
      return () => { cancelled = true }
    }

    fetchToken()
      .then(token => {
        if (!cancelled) setVideoSrc(`/api/stream/${id}?token=${token}`)
      })
      .catch(() => {
        if (!cancelled) setAuthError(true)
      })

    intervalRef.current = setInterval(refreshToken, 55000)
    return () => {
      cancelled = true
      clearInterval(intervalRef.current)
    }
  }, [id])

  return (
    <div style={{ background: '#111', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '16px', boxSizing: 'border-box', overflow: 'hidden' }}>

      {/* CTA Bar */}
      <div style={{ width: '100%', textAlign: 'center', padding: '10px 0', marginBottom: '12px', flexShrink: 0 }}>
        <a
          href={`https://onyx-reelz.com/signup${refParam ? `?ref=${refParam}` : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#fff', fontWeight: 800, fontSize: '22px', textDecoration: 'underline', cursor: 'pointer', letterSpacing: '0.5px', textShadow: '0 0 20px rgba(77,208,255,0.8)' }}
        >
          Create your own AI Reel at onyx-reelz.com
        </a>
      </div>

      {/* Middle row: left ad | video | right ad */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', width: '100%', flex: 1, minHeight: 0 }}>

        {/* Left ad */}
        <div style={{ width: '160px', flexShrink: 0, boxSizing: 'border-box' }} />

        {/* Video */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {authError ? (
            <div style={{ color: '#aaa', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 16, marginBottom: 8 }}>Sign in to watch this reel</div>
              <a href={`https://onyx-reelz.com/login${refParam ? `?ref=${refParam}` : ''}`} style={{ color: '#7de0ff', fontSize: 14 }}>
                Log in to Onyx Reelz
              </a>
            </div>
          ) : videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              controlsList="nodownload"
              onContextMenu={e => e.preventDefault()}
              style={{ width: '100%', maxHeight: '100%', borderRadius: '10px', display: 'block' }}
            />
          ) : (
            <div style={{ color: '#555', fontSize: 14 }}>Loading…</div>
          )}
        </div>

        {/* Right ad */}
        <div style={{ width: '160px', flexShrink: 0, boxSizing: 'border-box' }} />

      </div>

      {/* Bottom leaderboard ad */}
      <div style={{ width: '100%', height: '80px', flexShrink: 0, marginTop: '12px', boxSizing: 'border-box' }} />

    </div>
  )
}
