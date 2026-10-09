import fs from 'fs'
import path from 'path'
import { marked } from 'marked'

// Bumped whenever terms.md, rental-agreement.md, or privacy.md changes in a
// way that needs re-acceptance. See TermsGateModal / accept_terms RPC.
export const CURRENT_TERMS_VERSION = 1

export type LegalSlug =
  | 'terms'
  | 'rental-agreement'
  | 'privacy'
  | 'cookies'
  | 'prohibited'
  | 'contact'
  | 'safety'

export interface LegalDoc {
  html: string
}

// Content lives in content/legal/<locale>/<slug>.md -- separate from code so
// a lawyer (or a future Dutch translation) can edit it without touching
// TypeScript. See next.config.mjs outputFileTracingIncludes, which makes
// sure these files are bundled on Vercel.
export function loadLegalDoc(slug: LegalSlug, locale: string = 'en'): LegalDoc {
  const filePath = path.join(process.cwd(), 'content', 'legal', locale, `${slug}.md`)
  const markdown = fs.readFileSync(filePath, 'utf-8')
  const html = marked.parse(markdown, { async: false }) as string
  return { html }
}
