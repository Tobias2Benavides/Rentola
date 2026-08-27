export const CATEGORIES = [
  'Tools & Equipment',
  'Electronics',
  'Outdoor & Camping',
  'Sports & Fitness',
  'Party & Events',
  'Home & Garden',
  'Vehicles',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
