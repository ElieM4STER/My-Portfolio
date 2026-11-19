// Storage adapter for visitor video messages.
//
// RecordModal.js never talks to Supabase directly — it talks to the functions
// below. To move to a different backend (S3, Cloudflare R2, an upload API),
// reimplement these three functions and nothing else changes.
//
// The admin inbox reads through the server (api/admin.js), which already has
// its own service-role helpers in api/lib/supabase.js.

import { supabase } from './supabase'
import { settings } from './settings'

const BUCKET = 'recordings'

export function isRecordingConfigured() {
  return Boolean(supabase && settings.recording.enabled)
}

export async function uploadRecording(blob, path, mime) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: mime, upsert: false })
  if (error) throw error
}

export async function saveRecordingMeta(meta) {
  const { error } = await supabase.from('recordings').insert(meta)
  if (error) throw error
}

export async function discardRecording(path) {
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {})
}
