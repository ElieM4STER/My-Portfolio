export const MAX_MESSAGES = 16
export const MAX_MESSAGE_CHARS = 2000

export function sanitizeMessages(input) {
  if (!Array.isArray(input)) return []

  return input
    .filter(message => message && typeof message === 'object')
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .filter(message => typeof message.content === 'string' && message.content.trim())
    .slice(-MAX_MESSAGES)
    .map(message => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }))
}
