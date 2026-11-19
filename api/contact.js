import { insertRow } from './lib/supabase.js'
import nodemailer from 'nodemailer'

async function sendNotificationEmail({ name, email, subject, message }) {
  try {
    const to = process.env.CONTACT_TO_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_TO || 'byiringiroelie468@gmail.com'
    if (!to) return false

    let transporter

    if (process.env.RESEND_API_KEY) {
      transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      })
    } else if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      })
    } else {
      // Try local/dev SMTP if available, otherwise skip
      return false
    }

    const from = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_FROM || process.env.RESEND_FROM || `Portfolio Contact <${to}>`
    const mailSubject = subject?.trim() || `Portfolio message from ${name}`
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`

    await transporter.sendMail({
      from,
      to,
      replyTo: email || undefined,
      subject: mailSubject,
      text,
    })
    return true
  } catch (err) {
    console.error('Failed to send contact notification email:', err?.message || err)
    return false
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { name = '', email = '', subject = '', message = '' } = req.body || {}
  if (!name.trim() || !message.trim()) {
    return res.status(400).json({ error: 'A name and message are required' })
  }

  const ok = await insertRow('messages', {
    name: String(name).trim().slice(0, 120),
    email: String(email).trim().slice(0, 160),
    subject: String(subject).trim().slice(0, 160),
    message: String(message).trim().slice(0, 5000),
    read: false,
  })

  if (!ok) return res.status(502).json({ error: 'Message inbox is not connected' })

  // Best effort email notification to admin
  await sendNotificationEmail({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() })

  return res.status(200).json({ ok: true })
}