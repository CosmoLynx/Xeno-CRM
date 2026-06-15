import {
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
} from 'lucide-react'

/** Channel metadata for badges and icons. */
export const CHANNEL_CONFIG = {
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    badge: 'bg-emerald-50 text-emerald-700',
  },
  sms: {
    label: 'SMS',
    icon: Smartphone,
    badge: 'bg-blue-50 text-blue-700',
  },
  email: {
    label: 'Email',
    icon: Mail,
    badge: 'bg-violet-50 text-violet-700',
  },
  rcs: {
    label: 'RCS',
    icon: MessageSquare,
    badge: 'bg-indigo-50 text-indigo-700',
  },
}

/** Campaign lifecycle status styles. */
export const CAMPAIGN_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  sending: 'bg-amber-50 text-amber-700',
  sent: 'bg-emerald-50 text-emerald-700',
}

/** Message delivery status styles. */
export const MESSAGE_STATUS_STYLES = {
  sent: 'bg-slate-100 text-slate-700',
  delivered: 'bg-blue-50 text-blue-700',
  opened: 'bg-violet-50 text-violet-700',
  clicked: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
}

/** Character limits per channel. */
export const CHANNEL_CHAR_LIMITS = {
  sms: 160,
  whatsapp: 300,
  rcs: 300,
  email: 500,
}

export function getChannelConfig(channel) {
  return CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.whatsapp
}

export function getCharLimit(channel) {
  return CHANNEL_CHAR_LIMITS[channel] || 300
}

export function formatPercent(numerator, denominator) {
  if (!denominator) return '—'
  return `${Math.round((numerator / denominator) * 100)}%`
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function personalizePreview(template, customer) {
  if (!customer) return template
  return template
    .replaceAll('{name}', customer.name || '')
    .replaceAll('{city}', customer.city || '')
    .replaceAll('{email}', customer.email || '')
}
