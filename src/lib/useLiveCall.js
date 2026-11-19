import { useCallback, useEffect, useRef, useState } from 'react'
import { settings } from './settings'
import { isRealtimeConfigured, createChannel } from './realtime'

export const CALL_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  RINGING: 'ringing',
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  DECLINED: 'declined',
  BUSY: 'busy',
  TIMEOUT: 'timeout',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable',
}

const BUSY_STATES = [
  CALL_STATUS.RINGING,
  CALL_STATUS.CONNECTING,
  CALL_STATUS.ACTIVE,
]

const RESTARTABLE = [
  CALL_STATUS.IDLE,
  CALL_STATUS.DECLINED,
  CALL_STATUS.BUSY,
  CALL_STATUS.TIMEOUT,
  CALL_STATUS.ERROR,
  CALL_STATUS.UNAVAILABLE,
]

function makeCallId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function useLiveCall(role) {
  const [status, setStatusState] = useState(() =>
    isRealtimeConfigured() ? CALL_STATUS.IDLE : CALL_STATUS.UNAVAILABLE,
  )
  const [adminOnline, setAdminOnline] = useState(false)
  const [presenceSynced, setPresenceSynced] = useState(false)
  const [incoming, setIncoming] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [error, setError] = useState('')

  const statusRef = useRef(status)
  const channelRef = useRef(null)
  const pcRef = useRef(null)
  const callIdRef = useRef(null)
  const localRef = useRef(null)
  const timeoutRef = useRef(null)
  const pendingIceRef = useRef([])
  const earlySignalsRef = useRef([])

  const setStatus = useCallback(value => {
    statusRef.current = value
    setStatusState(value)
  }, [])

  const send = useCallback((event, payload) => {
    channelRef.current?.send(event, payload)
  }, [])

  const teardown = useCallback(
    ({ stopLocal = true } = {}) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      const pc = pcRef.current
      if (pc) {
        pc.onicecandidate = null
        pc.ontrack = null
        pc.onconnectionstatechange = null
        try {
          pc.close()
        } catch {
          /* already closed */
        }
        pcRef.current = null
      }
      pendingIceRef.current = []
      earlySignalsRef.current = []
      callIdRef.current = null
      if (stopLocal && localRef.current) {
        localRef.current.getTracks().forEach(track => {
          try {
            track.stop()
          } catch {
            /* track already ended */
          }
        })
        localRef.current = null
        setLocalStream(null)
      }
      setRemoteStream(null)
      setIncoming(null)
    },
    [],
  )

  const stopLocalMedia = useCallback(() => {
    localRef.current?.getTracks().forEach(track => {
      try {
        track.stop()
      } catch {
        /* track already ended */
      }
    })
    localRef.current = null
    setLocalStream(null)
  }, [])

  const flushPendingIce = useCallback(async pc => {
    const queued = pendingIceRef.current
    pendingIceRef.current = []
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {
        /* candidate rejected */
      }
    }
  }, [])

  const handleSignal = useCallback(
    async payload => {
      if (!payload || payload.callId !== callIdRef.current) return

      if (payload.kind === 'ice') {
        const pc = pcRef.current
        if (!pc) return
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(payload.candidate)
          return
        }
        try {
          await pc.addIceCandidate(payload.candidate)
        } catch {
          /* candidate rejected */
        }
        return
      }

      const pc = pcRef.current
      if (!pc) {
        if (statusRef.current === CALL_STATUS.CONNECTING) earlySignalsRef.current.push(payload)
        return
      }

      try {
        if (payload.kind === 'offer') {
          await pc.setRemoteDescription(payload.sdp)
          await flushPendingIce(pc)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          send('signal', {
            callId: callIdRef.current,
            kind: 'answer',
            sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
          })
        } else if (payload.kind === 'answer') {
          await pc.setRemoteDescription(payload.sdp)
          await flushPendingIce(pc)
        }
      } catch {
        send('call-end', { callId: callIdRef.current })
        setStatus(CALL_STATUS.ERROR)
        setError('The call could not be negotiated. Please try again.')
        teardown()
      }
    },
    [flushPendingIce, send, setStatus, teardown],
  )

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: settings.call.iceServers })
    pcRef.current = pc
    const stream = localRef.current
    if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.onicecandidate = event => {
      if (event.candidate) {
        send('signal', {
          callId: callIdRef.current,
          kind: 'ice',
          candidate: event.candidate.toJSON(),
        })
      }
    }
    pc.ontrack = event => {
      setRemoteStream(event.streams[0] || new MediaStream([event.track]))
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        if (statusRef.current === CALL_STATUS.CONNECTING || statusRef.current === CALL_STATUS.REQUESTING) {
          setStatus(CALL_STATUS.ACTIVE)
        }
      }
      if (pc.connectionState === 'failed' && pcRef.current === pc) {
        send('call-end', { callId: callIdRef.current })
        teardown()
        setStatus(CALL_STATUS.ERROR)
        setError('The connection was lost. Please try again.')
      }
    }

    const queued = earlySignalsRef.current
    earlySignalsRef.current = []
    queued.forEach(payload => {
      handleSignal(payload)
    })

    return pc
  }, [handleSignal, send, setStatus, teardown])

  const openLocalMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia(settings.call.media)
    localRef.current = stream
    setLocalStream(stream)
    setMicOn(true)
    setCamOn(true)
    return stream
  }, [])

  const startCall = useCallback(async () => {
    if (!channelRef.current) {
      setStatus(CALL_STATUS.UNAVAILABLE)
      return
    }
    if (!RESTARTABLE.includes(statusRef.current)) return
    setError('')
    setStatus(CALL_STATUS.REQUESTING)

    try {
      await openLocalMedia()
    } catch {
      setStatus(CALL_STATUS.ERROR)
      setError('Camera or microphone access was blocked. Allow access in your browser and try again.')
      return
    }

    // The visitor may have pressed Cancel while the permission prompt was open.
    if (statusRef.current !== CALL_STATUS.REQUESTING) {
      stopLocalMedia()
      return
    }

    const callId = makeCallId()
    callIdRef.current = callId
    send('call-request', { callId, at: Date.now() })

    timeoutRef.current = setTimeout(() => {
      if (statusRef.current === CALL_STATUS.REQUESTING) {
        send('call-cancel', { callId })
        teardown()
        setStatus(CALL_STATUS.TIMEOUT)
      }
    }, settings.call.requestTimeoutMs)
  }, [openLocalMedia, send, setStatus, stopLocalMedia, teardown])

  const cancelCall = useCallback(() => {
    send('call-cancel', { callId: callIdRef.current })
    teardown()
    setStatus(CALL_STATUS.IDLE)
  }, [send, setStatus, teardown])

  const beginAsCaller = useCallback(async () => {
    try {
      const pc = createPeer()
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send('signal', {
        callId: callIdRef.current,
        kind: 'offer',
        sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
      })
    } catch {
      send('call-end', { callId: callIdRef.current })
      teardown()
      setStatus(CALL_STATUS.ERROR)
      setError('The call could not be started. Please try again.')
    }
  }, [createPeer, send, setStatus, teardown])

  const acceptCall = useCallback(async () => {
    const callId = callIdRef.current
    if (!callId) return
    setError('')
    setStatus(CALL_STATUS.CONNECTING)
    setIncoming(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    try {
      await openLocalMedia()
    } catch {
      send('call-decline', { callId })
      teardown()
      setStatus(CALL_STATUS.ERROR)
      setError('Camera or microphone access was blocked for the call.')
      return
    }

    // The visitor may have hung up while the permission prompt was open.
    if (callIdRef.current !== callId) {
      stopLocalMedia()
      return
    }

    try {
      createPeer()
    } catch {
      send('call-decline', { callId })
      teardown()
      setStatus(CALL_STATUS.ERROR)
      setError('Video calls are not supported in this browser.')
      return
    }

    send('call-accept', { callId })
  }, [createPeer, openLocalMedia, send, setStatus, stopLocalMedia, teardown])

  const declineCall = useCallback(() => {
    const callId = callIdRef.current
    send('call-decline', { callId })
    teardown({ stopLocal: false })
    setStatus(CALL_STATUS.IDLE)
  }, [send, setStatus, teardown])

  const hangUp = useCallback(() => {
    send('call-end', { callId: callIdRef.current })
    teardown()
    setStatus(CALL_STATUS.IDLE)
  }, [send, setStatus, teardown])

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMicOn(track.enabled)
  }, [])

  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setCamOn(track.enabled)
  }, [])

  useEffect(() => {
    if (!isRealtimeConfigured()) return undefined

    let active = true
    const channel = createChannel({
      presenceKey: `live-${role}-${makeCallId()}`,
      presenceData: { role },
      events: {
        'call-request': payload => {
          if (role !== 'admin' || !payload?.callId) return
          if (BUSY_STATES.includes(statusRef.current)) {
            send('call-busy', { callId: payload.callId })
            return
          }
          callIdRef.current = payload.callId
          setIncoming({ callId: payload.callId, at: payload.at || Date.now() })
          setStatus(CALL_STATUS.RINGING)
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            if (statusRef.current === CALL_STATUS.RINGING || statusRef.current === CALL_STATUS.CONNECTING) {
              teardown()
              setStatus(CALL_STATUS.IDLE)
            }
          }, settings.call.ringTimeoutMs)
        },

        'call-accept': payload => {
          if (role !== 'visitor' || !payload || payload.callId !== callIdRef.current) return
          if (statusRef.current !== CALL_STATUS.REQUESTING) return
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
          }
          setStatus(CALL_STATUS.CONNECTING)
          beginAsCaller()
        },

        'call-decline': payload => {
          if (role !== 'visitor' || !payload || payload.callId !== callIdRef.current) return
          teardown()
          setStatus(CALL_STATUS.DECLINED)
        },

        'call-busy': payload => {
          if (role !== 'visitor' || !payload || payload.callId !== callIdRef.current) return
          teardown()
          setStatus(CALL_STATUS.BUSY)
        },

        'call-cancel': payload => {
          if (role !== 'admin' || !payload || payload.callId !== callIdRef.current) return
          // RINGING: the visitor gave up while it rang.
          // CONNECTING: the visitor gave up after accept but before the
          // handshake finished (e.g. their request timed out) — tear down too,
          // otherwise the admin's camera stays live with nobody on the call.
          if (statusRef.current !== CALL_STATUS.RINGING && statusRef.current !== CALL_STATUS.CONNECTING) return
          teardown({ stopLocal: true })
          setStatus(CALL_STATUS.IDLE)
        },

        'call-end': payload => {
          if (!payload || payload.callId !== callIdRef.current) return
          teardown()
          setStatus(CALL_STATUS.IDLE)
        },

        signal: payload => {
          handleSignal(payload)
        },
      },
      onMembers: members => {
        setAdminOnline(members.some(member => member?.role === 'admin'))
        setPresenceSynced(true)
      },
      onStatus: transportStatus => {
        if (!active) return
        // If the realtime transport drops, treat presence as settled (offline)
        // instead of leaving visitors on "Checking availability…" forever.
        if (transportStatus === 'CHANNEL_ERROR' || transportStatus === 'TIMED_OUT' || transportStatus === 'CLOSED') {
          setAdminOnline(false)
          setPresenceSynced(true)
        }
      },
    })

    if (!channel) return undefined
    channelRef.current = channel

    return () => {
      active = false
      if (callIdRef.current) send('call-end', { callId: callIdRef.current })
      teardown()
      setStatus(CALL_STATUS.IDLE)
      setPresenceSynced(false)
      setAdminOnline(false)
      channel.close()
      channelRef.current = null
    }
  }, [role, beginAsCaller, handleSignal, send, setStatus, teardown])

  return {
    status,
    adminOnline,
    presenceSynced,
    incoming,
    localStream,
    remoteStream,
    micOn,
    camOn,
    error,
    startCall,
    cancelCall,
    acceptCall,
    declineCall,
    hangUp,
    toggleMic,
    toggleCam,
  }
}
