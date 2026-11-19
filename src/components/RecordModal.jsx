import { useEffect, useRef, useState } from 'react'
import Icon from './Icons'
import { settings } from '../lib/settings'
import {
  isRecordingConfigured,
  uploadRecording,
  saveRecordingMeta,
  discardRecording,
} from '../lib/recordings'

const MAX_DURATION = settings.recording.maxDurationSec
const MAX_SIZE = settings.recording.maxFileSizeMb * 1024 * 1024
const PICK_TYPES = settings.recording.pickTypes

const EMPTY_FORM = { name: '', email: '', message: '' }

const canRecord = () =>
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia)

function cameraError(err) {
  const name = err?.name || ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Camera or microphone access was blocked. Allow access in your browser and try again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'No camera or microphone was found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your camera or microphone is in use by another app. Close it and try again.'
  }
  return 'Could not open the camera. Please try again.'
}

function formatTime(total) {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function RecordModal({ onClose, onSwitchToCall }) {
  const [phase, setPhase] = useState('intro')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [reviewUrl, setReviewUrl] = useState('')
  const [opening, setOpening] = useState(false)

  const videoRef = useRef(null)
  const reviewRef = useRef(null)
  const liveRef = useRef(null)
  const recorderRef = useRef(null)
  const blobRef = useRef(null)
  const reviewUrlRef = useRef('')
  const timerRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
      liveRef.current?.getTracks().forEach(track => track.stop())
      const recorder = recorderRef.current
      if (recorder && recorder.state === 'recording') {
        recorder.onstop = null
        try {
          recorder.stop()
        } catch {
          /* already stopped */
        }
      }
      if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current)
    }
  }, [])

  const startCamera = async () => {
    if (opening) return
    setError('')

    if (!canRecord()) {
      setError(
        window.isSecureContext
          ? 'This browser cannot record video. Try Chrome, Edge, Firefox or Safari.'
          : 'Camera access needs a secure connection (HTTPS). Open the site over https:// and try again.',
      )
      return
    }

    setOpening(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(settings.recording.media)
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      liveRef.current = stream
      // Drop the previous take only once the new preview is about to show, so
      // a failed re-open leaves the review screen (and its player) intact.
      blobRef.current = null
      if (reviewUrlRef.current) {
        URL.revokeObjectURL(reviewUrlRef.current)
        reviewUrlRef.current = ''
      }
      setReviewUrl('')
      setPhase('preview')
    } catch (err) {
      if (mountedRef.current) setError(cameraError(err))
    } finally {
      if (mountedRef.current) setOpening(false)
    }
  }

  // The preview element only mounts once the phase flips to "preview", so the
  // stream has to be attached after the render instead of inside startCamera().
  useEffect(() => {
    const video = videoRef.current
    const stream = liveRef.current
    if (!video || !stream || video.srcObject === stream) return
    video.srcObject = stream
    video.muted = true
    const started = video.play()
    if (started?.catch) started.catch(() => {})
  }, [phase])

  const startRecording = () => {
    const stream = liveRef.current
    if (!stream) return
    const mimeType = PICK_TYPES.find(type => {
      try {
        return MediaRecorder.isTypeSupported(type)
      } catch {
        return false
      }
    })

    let recorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      setError('Recording is not supported in this browser.')
      return
    }

    const chunks = []
    recorder.ondataavailable = event => {
      if (event.data?.size) chunks.push(event.data)
    }
    recorder.onerror = () => {
      if (!mountedRef.current) return
      setError('Recording failed part-way through. Please try again.')
      setPhase('preview')
    }
    recorder.onstop = () => {
      if (!mountedRef.current) return
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' })
      blobRef.current = blob
      liveRef.current?.getTracks().forEach(track => track.stop())
      liveRef.current = null
      if (reviewUrlRef.current) URL.revokeObjectURL(reviewUrlRef.current)
      reviewUrlRef.current = URL.createObjectURL(blob)
      setReviewUrl(reviewUrlRef.current)
      setPhase('review')
    }

    recorderRef.current = recorder
    setSeconds(0)
    setPhase('recording')
    recorder.start()
    timerRef.current = setInterval(() => setSeconds(value => value + 1), 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') recorder.stop()
  }

  useEffect(() => {
    if (phase === 'recording' && seconds >= MAX_DURATION) stopRecording()
  }, [seconds, phase])

  const retake = () => {
    startCamera()
  }

  const update = field => event => setForm(current => ({ ...current, [field]: event.target.value }))

  const send = async () => {
    const blob = blobRef.current
    if (!blob || phase === 'uploading') return
    if (blob.size > MAX_SIZE) {
      setError(
        `That recording is too large (${settings.recording.maxFileSizeMb} MB max). Please record a shorter clip.`,
      )
      return
    }
    if (!isRecordingConfigured()) {
      setError('Video messages are not configured on this site yet. Please use email or WhatsApp below.')
      return
    }

    setError('')
    setPhase('uploading')

    const mime = (blob.type || '').split(';')[0].trim().toLowerCase() || 'video/webm'
    const ext = mime.includes('mp4') ? 'mp4' : 'webm'
    const path = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    try {
      await uploadRecording(blob, path, mime)
    } catch (err) {
      if (mountedRef.current) {
        setError(`Upload failed: ${err?.message || 'the file could not be uploaded'}`)
        setPhase('review')
      }
      return
    }

    try {
      await saveRecordingMeta({
        name: form.name.trim().slice(0, 120),
        email: form.email.trim().slice(0, 200),
        message: form.message.trim().slice(0, 2000),
        path,
        mime,
        duration: Math.min(seconds, MAX_DURATION),
        size: blob.size,
      })
    } catch {
      // Remove the orphaned object so a retry cannot leave a duplicate behind.
      await discardRecording(path)
      if (mountedRef.current) {
        setError('The recording could not be saved. Please try again.')
        setPhase('review')
      }
      return
    }

    if (mountedRef.current) setPhase('done')
  }

  const busy = phase === 'uploading'

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const onScrim = event => {
    if (event.target === event.currentTarget && !busy) onClose()
  }

  return (
    <div
      className="modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Record a video message"
      onMouseDown={onScrim}
    >
      <div className="modal-card">
        <div className="modal-head">
          <span className="modal-kicker"><Icon name="record" /> Video message</span>
          <button className="chat-close" onClick={onClose} aria-label="Close recorder" disabled={busy}>
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          {phase === 'intro' && (
            <div className="rec-intro">
              <span className="rec-badge"><Icon name="video" /></span>
              <h3>Record a quick video for Elie</h3>
              <p>
                Say who you are and what you need — up to {Math.round(MAX_DURATION / 60)} minutes. It goes
                straight to his private inbox; nobody else can watch it.
              </p>
              {!isRecordingConfigured() ? (
                <p className="form-note form-note-error">
                  Video messages are not configured on this site yet. Please use email or WhatsApp below.
                </p>
              ) : canRecord() ? (
                <button className="btn btn-primary" onClick={startCamera} disabled={opening}>
                  <Icon name="video" /> {opening ? 'Opening camera…' : 'Open camera'} <span>→</span>
                </button>
              ) : (
                <p className="form-note form-note-error">
                  {window.isSecureContext
                    ? 'This browser cannot record video. Try Chrome, Edge, Firefox or Safari.'
                    : 'Camera access needs a secure connection (HTTPS). Open the site over https:// and try again.'}
                </p>
              )}
              {onSwitchToCall && (
                <button className="btn btn-ghost" onClick={onSwitchToCall}>
                  <Icon name="phone" /> Prefer a live call?
                </button>
              )}
            </div>
          )}

          {(phase === 'preview' || phase === 'recording') && (
            <div className="rec-stage">
              <video ref={videoRef} className="rec-video rec-video-mirror" autoPlay muted playsInline />
              {phase === 'recording' && (
                <span className="rec-timer"><i /> {formatTime(Math.min(seconds, MAX_DURATION))}</span>
              )}
              <div className="rec-controls">
                {phase === 'preview' ? (
                  <button className="btn btn-primary" onClick={startRecording}>
                    <Icon name="record" /> Start recording
                  </button>
                ) : (
                  <button className="btn btn-dark" onClick={stopRecording}>
                    <Icon name="close" /> Stop
                  </button>
                )}
                <span className="rec-note">Max {formatTime(MAX_DURATION)} · stored privately</span>
              </div>
            </div>
          )}

          {(phase === 'review' || phase === 'uploading') && (
            <div className="rec-review">
              <video ref={reviewRef} className="rec-video" src={reviewUrl} controls playsInline />
              <div className="rec-fields">
                <label className="form-field">
                  <span>Your name</span>
                  <input type="text" value={form.name} onChange={update('name')} placeholder="Your name" />
                </label>
                <label className="form-field">
                  <span>Your email</span>
                  <input type="email" value={form.email} onChange={update('email')} placeholder="you@company.com" />
                </label>
                <label className="form-field">
                  <span>Short note (optional)</span>
                  <textarea rows="3" value={form.message} onChange={update('message')} placeholder="What is the project about?" />
                </label>
              </div>
              <div className="rec-actions">
                <button className="btn btn-light" onClick={retake} disabled={busy || opening}>
                  <Icon name="record" /> {opening ? 'Opening camera…' : 'Retake'}
                </button>
                <button className="btn btn-primary" onClick={send} disabled={busy}>
                  <Icon name="send" /> {busy ? 'Sending…' : 'Send recording'} <span>→</span>
                </button>
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="rec-intro">
              <span className="rec-badge rec-badge-ok"><Icon name="check" /></span>
              <h3>Recording delivered</h3>
              <p>Elie will watch it and get back to you using the contact details you left.</p>
              <button className="btn btn-primary" onClick={onClose}>
                Done <span>→</span>
              </button>
            </div>
          )}

          {error && <p className="form-note form-note-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
