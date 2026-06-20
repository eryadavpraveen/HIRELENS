import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(date) {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date) {
  if (!date) return '—'
  return `${formatDate(date)} ${formatTime(date)}`
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}

export function generateInterviewCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function getSeverityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'danger':
      return 'danger'
    case 'medium':
    case 'warning':
      return 'warning'
    case 'low':
    case 'info':
      return 'accent'
    default:
      return 'muted'
  }
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
