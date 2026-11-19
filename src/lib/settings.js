// Single source of truth for every tunable in the call / recording platform.
//
// HOW TO CHANGE THINGS LATER
// - Behaviour defaults: edit the values below.
// - Per-deployment overrides: set the matching VITE_* variable in .env
//   (see .env.example). No component code needs to change.
// - Swap technology (signaling, storage): edit src/lib/realtime.js and
//   src/lib/recordings.js only — every UI already talks to those adapters.
// - Turn a feature off entirely: set VITE_ENABLE_CALLS=false or
//   VITE_ENABLE_RECORDING=false; the UI shows its "unavailable" state.

const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const bool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback
  return value === 'true' || value === '1'
}

const parseIceServers = value => {
  if (value) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      /* fall through to default */
    }
  }
  // STUN only by default. For strict/corporate networks add a TURN server:
  // VITE_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com","username":"u","credential":"p"}]
  return [{ urls: 'stun:stun.l.google.com:19302' }]
}

export const settings = {
  call: {
    enabled: bool(import.meta.env.VITE_ENABLE_CALLS, true),
    channel: import.meta.env.VITE_CALL_CHANNEL || 'elie-live-call',
    requestTimeoutMs: int(import.meta.env.VITE_CALL_REQUEST_TIMEOUT_MS, 25000),
    ringTimeoutMs: int(import.meta.env.VITE_CALL_RING_TIMEOUT_MS, 45000),
    iceServers: parseIceServers(import.meta.env.VITE_ICE_SERVERS),
    media: {
      video: { facingMode: 'user', width: { ideal: 1280 } },
      audio: true,
    },
  },

  recording: {
    enabled: bool(import.meta.env.VITE_ENABLE_RECORDING, true),
    maxDurationSec: int(import.meta.env.VITE_RECORDING_MAX_SECONDS, 180),
    maxFileSizeMb: int(import.meta.env.VITE_RECORDING_MAX_MB, 50),
    media: {
      video: { facingMode: 'user', width: { ideal: 1280 } },
      audio: true,
    },
    pickTypes: [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ],
  },
}

export default settings
