import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string) {
  return format(parseISO(date), 'dd/MM/yyyy')
}

export function daysUntil(date: string) {
  return differenceInDays(parseISO(date), new Date())
}

export function alertUrgency(days: number): 'critical' | 'warning' | 'info' {
  if (days <= 30) return 'critical'
  if (days <= 60) return 'warning'
  return 'info'
}

export function policyTypeLabel(type: string) {
  const map: Record<string, string> = {
    health: 'ביטוח בריאות',
    life: 'ביטוח חיים',
    critical: 'מחלות קשות',
    accident: 'תאונות אישיות',
    disability: 'אובדן כושר עבודה',
    other: 'אחר',
  }
  return map[type] ?? type
}
