import type { ReportReason } from './types'

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'prohibited_item', label: 'Prohibited item' },
  { value: 'spam', label: 'Spam or fake listing' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
]
