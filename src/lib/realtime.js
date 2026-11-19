// Signaling adapter for live calls.
//
// The call engine (useLiveCall.js) never talks to Supabase directly — it talks
// to the channel object returned by createChannel(). To move to a different
// technology (WebSocket server, Socket.io, a hosted signaling API, ...),
// reimplement createChannel() here and nothing else changes.
//
// Contract returned by createChannel():
//   send(event, payload)  fire-and-forget broadcast to the other role
//   close()               unsubscribe and release the connection
//
// createChannel() options:
//   presenceKey    unique presence key for this client
//   presenceData   object tracked while subscribed (e.g. { role: 'admin' })
//   events         map of event name -> payload callback
//   onMembers(members)  called on every presence sync with the member list
//   onStatus(status)    called with transport status changes

import { supabase } from './supabase'
import { settings } from './settings'

export function isRealtimeConfigured() {
  return Boolean(supabase && settings.call.enabled)
}

// Opens the realtime socket before the visitor opens the call modal, so the
// availability check costs one round-trip instead of TCP + TLS + join.
// Called on intent (scroll/hover near the call buttons) — safe to call often.
export function warmCallTransport() {
  if (!isRealtimeConfigured()) return
  try {
    supabase.realtime?.connect?.()
  } catch {
    /* the first real subscribe will retry */
  }
}

export function createChannel({ presenceKey, presenceData, events = {}, onMembers, onStatus }) {
  if (!supabase) return null

  const channel = supabase.channel(settings.call.channel, {
    config: { presence: { key: presenceKey } },
  })

  Object.entries(events).forEach(([event, callback]) => {
    channel.on('broadcast', { event }, ({ payload }) => callback(payload))
  })

  if (onMembers) {
    channel.on('presence', { event: 'sync' }, () => {
      onMembers(Object.values(channel.presenceState()).flat())
    })
  }

  let subscribed = false
  // Sends are chained so the last message of a session (usually `call-end`)
  // is confirmed by the server before close() issues the channel leave.
  let queue = Promise.resolve()

  channel.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      subscribed = true
      if (presenceData) channel.track(presenceData)
    }
    onStatus?.(status)
  })

  return {
    send(event, payload) {
      if (!subscribed) return
      queue = queue
        .then(() => channel.send({ type: 'broadcast', event, payload }))
        .catch(() => {})
    },
    close() {
      const pending = queue
      subscribed = false
      pending.then(() => {
        Promise.resolve(supabase.removeChannel(channel)).catch(() => {})
      })
    },
  }
}
