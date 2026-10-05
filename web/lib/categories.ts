export const CATEGORIES = [
  'Tools & Equipment',
  'Electronics',
  'Outdoor & Camping',
  'Sports & Fitness',
  'Party & Events',
  'Home & Garden',
  'Vehicles',
  'Musical Instruments',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
