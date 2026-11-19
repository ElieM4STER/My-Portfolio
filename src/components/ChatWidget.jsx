import { useEffect, useRef, useState } from 'react'
import Icon from './Icons'
import { KNOWLEDGE_BASE } from '../lib/elieKnowledge'
import { createSseParser, extractReplyDelta } from '../lib/chatStream'

const ENDPOINT = '/api/chat'
const MAX_INPUT = 1000

const SUGGESTIONS = [
  'Who is Elie?',
  'What can you build?',
  'Explain an API simply',
  'How can I hire you?',
]

const TYPING_RESPONSES = ['Thinking', 'Checking my notes', 'Preparing an answer']

const CONTACT = KNOWLEDGE_BASE.contact
const GENERIC_ERROR = `Sorry, I could not get an answer just now. Please try again, or reach Elie at ${CONTACT}.`

function describeError(status, detail) {
  if (status === 429) {
    return 'The assistant is getting a lot of requests right now. Please wait a moment and try again.'
  }
  if (status === 503) {
    return `The assistant is not configured yet. You can reach Elie at ${CONTACT}.`
  }
  if (status === 400 && detail) {
    return `I could not send that message (${detail}). Please try again.`
  }
  return GENERIC_ERROR
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [typingLabel, setTypingLabel] = useState(TYPING_RESPONSES[0])
  const bodyRef = useRef(null)
  const inputRef = useRef(null)
  const messagesRef = useRef(messages)
  const abortRef = useRef(null)
  const idRef = useRef(0)

  const nextId = () => {
    idRef.current += 1
    return `message-${idRef.current}`
  }

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    const openChat = () => setOpen(true)
    window.addEventListener('open-elie-chat', openChat)
    return () => window.removeEventListener('open-elie-chat', openChat)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => inputRef.current?.focus(), 140)
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(id)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!busy) return
    const id = setInterval(() => {
      setTypingLabel(TYPING_RESPONSES[Math.floor(Math.random() * TYPING_RESPONSES.length)])
    }, 1400)
    return () => clearInterval(id)
  }, [busy])

  useEffect(() => {
    const element = bodyRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, busy, open])

  const send = async (text = input) => {
    const prompt = text.trim().slice(0, MAX_INPUT)
    if (!prompt || busy) return

    const history = messagesRef.current
      .filter(message => (message.from === 'user' || message.from === 'bot') && message.text.trim())
      .map(message => ({ role: message.from === 'user' ? 'user' : 'assistant', content: message.text }))

    const botId = nextId()
    const errorId = nextId()
    const userMessage = { id: nextId(), from: 'user', text: prompt }
    const botMessage = { id: botId, from: 'bot', text: '', streaming: true }

    setMessages(current => [...current, userMessage, botMessage])
    setInput('')
    setBusy(true)
    setTypingLabel(TYPING_RESPONSES[0])

    const controller = new AbortController()
    abortRef.current = controller
    let received = false
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 60000)

    const append = delta => {
      if (!delta) return
      received = true
      setMessages(current =>
        current.map(message => (message.id === botId ? { ...message, text: message.text + delta } : message)),
      )
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: prompt }],
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let detail = ''
        try {
          detail = (await response.json())?.error || ''
        } catch {
          /* response had no JSON body */
        }
        throw new Error(describeError(response.status, detail))
      }

      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        const parser = createSseParser(({ data, done }) => {
          if (done) return
          if (data?.error) {
            throw new Error(
              typeof data.error === 'string' ? data.error : data.error?.message || GENERIC_ERROR,
            )
          }
          append(extractReplyDelta(data))
        })

        if (response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            parser.push(decoder.decode(value, { stream: true }))
          }
          parser.push(decoder.decode())
        } else {
          parser.push(await response.text())
        }
        parser.flush()
      } else {
        const data = await response.json()
        if (data?.error) {
          throw new Error(
            typeof data.error === 'string' ? data.error : data.error?.message || GENERIC_ERROR,
          )
        }
        append(String(data?.reply || '').trim())
      }

      if (!received) throw new Error('The assistant returned an empty reply. Please try again.')
      setMessages(current =>
        current.map(message => (message.id === botId ? { ...message, streaming: false } : message)),
      )
    } catch (error) {
      if (error.name === 'AbortError' && !timedOut) return
      if (error.name !== 'AbortError') {
        try {
          controller.abort()
        } catch {
          /* already aborted */
        }
      }

      const message = timedOut
        ? 'The assistant took too long to answer. Please try again.'
        : error.message && error.message !== 'Failed to fetch'
          ? error.message
          : GENERIC_ERROR

      setMessages(current => {
        const hasPartial = current.some(
          item => item.id === botId && item.text.trim().length > 0,
        )
        const cleaned = current
          .filter(item => item.id !== botId || hasPartial)
          .map(item => (item.id === botId ? { ...item, streaming: false } : item))
        return [...cleaned, { id: errorId, from: 'error', text: message }]
      })
    } finally {
      clearTimeout(timeoutId)
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <>
      <div className={`chat-widget${open ? ' open' : ''}`} aria-hidden={!open} inert={!open}>
        <div className="chat-panel" role="dialog" aria-label="Chat Elie Bot" aria-busy={busy}>
          <div className="chat-head">
            <span className="chat-avatar" aria-hidden="true">M</span>
            <span className="chat-title">
              Chat Elie Bot
              <small>AI assistant</small>
            </span>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <Icon name="close" />
            </button>
          </div>

          <div className="chat-body" ref={bodyRef} role="log" aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 && !busy && (
              <div className="chat-welcome">
                <p className="chat-hello">
                  Ask me anything. I can help with Elie&apos;s skills and projects, explain a tech idea, or point you
                  to his contact details.
                </p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map(suggestion => (
                    <button key={suggestion} className="chat-chip" onClick={() => send(suggestion)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(message => (
              <div key={message.id} className={`chat-msg ${message.from}`}>
                <span className="chat-who">
                  {message.from === 'user' ? 'You' : message.from === 'error' ? 'Notice' : 'elie-bot'}
                </span>
                {message.streaming && !message.text ? (
                  <p className="chat-text typing" role="status" aria-label="Assistant is typing">
                    <span className="typing-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="typing-label">{typingLabel}...</span>
                  </p>
                ) : (
                  <p className="chat-text">
                    {message.text}
                    {message.streaming && <span className="stream-caret" aria-hidden="true" />}
                  </p>
                )}
              </div>
            ))}
          </div>

          <form
            className="chat-input-row"
            onSubmit={event => {
              event.preventDefault()
              send()
            }}
          >
            <input
              ref={inputRef}
              className="chat-input"
              value={input}
              maxLength={MAX_INPUT}
              onChange={event => setInput(event.target.value)}
              disabled={busy}
              placeholder={busy ? 'Waiting for a reply...' : 'Ask me anything...'}
              aria-label="Message Chat Elie Bot"
              autoComplete="off"
              enterKeyHint="send"
            />
            <button
              className="chat-send"
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <Icon name="send" />
            </button>
          </form>
        </div>
      </div>

      <button
        className={`chat-toggle${open ? ' open' : ''}`}
        onClick={() => setOpen(current => !current)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        title={open ? 'Close assistant' : 'Chat Elie Bot'}
      >
        <Icon name={open ? 'close' : 'chat'} />
      </button>
    </>
  )
}
