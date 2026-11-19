import { useEffect, useRef } from 'react'
import Icon from './Icons'

export default function CallStage({
  localStream,
  remoteStream,
  connected,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onHangUp,
  waitingLabel = 'Connecting…',
}) {
  const localRef = useRef(null)
  const remoteRef = useRef(null)

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = localStream || null
  }, [localStream])

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream || null
  }, [remoteStream])

  return (
    <div className="call-stage">
      <div className="call-remote">
        <video ref={remoteRef} autoPlay playsInline />
        {!remoteStream && (
          <div className="call-waiting">
            <span className="status-dot" />
            {waitingLabel}
          </div>
        )}
      </div>

      <div className="call-self">
        <video ref={localRef} autoPlay muted playsInline />
        <span className="call-self-tag">You</span>
      </div>

      <div className="call-controls">
        <button
          type="button"
          className={`call-ctl${micOn ? '' : ' off'}`}
          onClick={onToggleMic}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          <Icon name={micOn ? 'mic' : 'micOff'} />
        </button>
        <button
          type="button"
          className={`call-ctl${camOn ? '' : ' off'}`}
          onClick={onToggleCam}
          aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
        >
          <Icon name={camOn ? 'video' : 'cameraOff'} />
        </button>
        <button type="button" className="call-ctl call-hang" onClick={onHangUp} aria-label="Hang up">
          <Icon name="phone" />
        </button>
      </div>

      {connected && <span className="call-live-tag"><i /> Live</span>}
    </div>
  )
}
