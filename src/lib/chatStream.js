export function createSseParser(onEvent) {
  let buffer = ''

  const dispatch = raw => {
    const data = raw
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''))
      .join('\n')

    if (!data) return
    if (data === '[DONE]') {
      onEvent({ done: true })
      return
    }

    try {
      onEvent({ data: JSON.parse(data) })
    } catch {
      /* Keep-alive comments and malformed events are ignored. */
    }
  }

  return {
    push(chunk) {
      buffer += String(chunk).replace(/\r\n?/g, '\n')
      let index = buffer.indexOf('\n\n')
      while (index !== -1) {
        dispatch(buffer.slice(0, index))
        buffer = buffer.slice(index + 2)
        index = buffer.indexOf('\n\n')
      }
    },
    flush() {
      if (buffer.trim()) dispatch(buffer)
      buffer = ''
    },
  }
}

export function extractReplyDelta(payload) {
  const choice = payload?.choices?.[0]
  const content = choice?.delta?.content ?? choice?.message?.content ?? choice?.text
  return typeof content === 'string' ? content : ''
}
