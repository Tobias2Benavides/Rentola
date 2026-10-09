import type { ReportReason } from './types'

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'illegal_prohibited_item', label: 'Illegal or prohibited item' },
  { value: 'stolen_item', label: 'Stolen item' },
  { value: 'scam_fraud', label: 'Scam or fraud' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_listing', label: 'Fake listing' },
  { value: 'safety_issue', label: 'Safety issue' },
  { value: 'ip_infringement', label: 'Intellectual property infringement' },
  { value: 'other', label: 'Other' },
]
