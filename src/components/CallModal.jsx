import { useEffect } from 'react'
import Icon from './Icons'
import CallStage from './CallStage'
import useLiveCall, { CALL_STATUS } from '../lib/useLiveCall'

const BUSY_LABELS = {
  [CALL_STATUS.DECLINED]: 'Elie declined the call right now.',
  [CALL_STATUS.BUSY]: 'Elie is already on another call.',
  [CALL_STATUS.TIMEOUT]: 'No answer — Elie might be away from the screen.',
}

export default function CallModal({ onClose, onSwitchToRecord }) {
  const call = useLiveCall('visitor')

  const checking = call.status === CALL_STATUS.IDLE && !call.presenceSynced
  const offline = call.status === CALL_STATUS.IDLE && call.presenceSynced && !call.adminOnline
  const inCall = call.status === CALL_STATUS.CONNECTING || call.status === CALL_STATUS.ACTIVE
  const retryable = [CALL_STATUS.DECLINED, CALL_STATUS.BUSY, CALL_STATUS.TIMEOUT, CALL_STATUS.ERROR]

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape' && !inCall) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inCall, onClose])

  const onScrim = event => {
    if (event.target === event.currentTarget && !inCall) onClose()
  }

  return (
    <div
      className="modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Live video call"
      onMouseDown={onScrim}
    >
      <div className="modal-card modal-card-call">
        <div className="modal-head">
          <span className="modal-kicker"><Icon name="video" /> Live video call</span>
          <button className="chat-close" onClick={onClose} aria-label="Close call">
            <Icon name="close" />
          </button>
        </div>

        <div className="modal-body">
          {inCall ? (
            <CallStage
              localStream={call.localStream}
              remoteStream={call.remoteStream}
              connected={call.status === CALL_STATUS.ACTIVE}
              micOn={call.micOn}
              camOn={call.camOn}
              onToggleMic={call.toggleMic}
              onToggleCam={call.toggleCam}
              onHangUp={call.hangUp}
              waitingLabel={call.status === CALL_STATUS.ACTIVE ? 'Waiting for video…' : 'Connecting…'}
            />
          ) : (
            <div className="call-panel">
              {checking && (
                <div className="call-info">
                  <span className="rec-badge"><Icon name="clock" /></span>
                  <h3>Checking availability…</h3>
                  <p>Seeing if Elie is online to take a call.</p>
                </div>
              )}

              {offline && (
                <div className="call-info">
                  <span className="rec-badge"><Icon name="clock" /></span>
                  <h3>Elie is offline right now</h3>
                  <p>Leave a recorded video instead — he will watch it and reply as soon as he is back.</p>
                  {onSwitchToRecord && (
                    <button className="btn btn-primary" onClick={onSwitchToRecord}>
                      <Icon name="record" /> Record a video <span>→</span>
                    </button>
                  )}
                </div>
              )}

              {call.status === CALL_STATUS.IDLE && call.adminOnline && (
                <div className="call-info">
                  <span className="rec-badge rec-badge-ok"><Icon name="video" /></span>
                  <h3>Elie is online</h3>
                  <p>Your camera opens only when you press start. The call is peer-to-peer and private.</p>
                  <button className="btn btn-primary" onClick={call.startCall}>
                    <Icon name="phone" /> Start video call <span>→</span>
                  </button>
                </div>
              )}

              {call.status === CALL_STATUS.REQUESTING && (
                <div className="call-info">
                  <span className="rec-badge rec-badge-ring"><i className="status-dot" /></span>
                  <h3>Ringing…</h3>
                  <p>Waiting for Elie to pick up.</p>
                  <button className="btn btn-light" onClick={call.cancelCall}>
                    <Icon name="close" /> Cancel
                  </button>
                </div>
              )}

              {retryable.includes(call.status) && (
                <div className="call-info">
                  <span className="rec-badge"><Icon name="phone" /></span>
                  <h3>{call.status === CALL_STATUS.ERROR ? 'Call could not start' : 'Call ended'}</h3>
                  <p>{call.error || BUSY_LABELS[call.status]}</p>
                  <div className="rec-actions">
                    <button className="btn btn-primary" onClick={call.startCall}>
                      <Icon name="phone" /> Try again
                    </button>
                    {onSwitchToRecord && (
                      <button className="btn btn-light" onClick={onSwitchToRecord}>
                        <Icon name="record" /> Record instead
                      </button>
                    )}
                  </div>
                </div>
              )}

              {call.status === CALL_STATUS.UNAVAILABLE && (
                <div className="call-info">
                  <span className="rec-badge"><Icon name="cameraOff" /></span>
                  <h3>Calls are unavailable</h3>
                  <p>Live calling is not configured on this site. Send a message or record a video instead.</p>
                  {onSwitchToRecord && (
                    <button className="btn btn-primary" onClick={onSwitchToRecord}>
                      <Icon name="record" /> Record a video <span>→</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
