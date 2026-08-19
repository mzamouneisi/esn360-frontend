import { MONTHS_FR } from './format'

export interface ReceiptParse {
  date?: string
  enseigne?: string
  adresse?: string
  montantHT?: number
  montantTTC?: number
  category?: string
  label?: string
}

interface Token {
  value: number
  index: number
  currency: boolean
}

const MONEY_RE = new RegExp(
  `(?:\\d+(?:[.,]\\d{1,2})?)\\s*(?:€|EUR|EURO|«|")|(?:€|EUR|EURO)\\s*\\d+(?:[.,]\\d{1,2})?`,
  'gi',
)

const MONTH_MAP: Record<string, number> = {}
for (const [i, name] of MONTHS_FR.entries()) {
  MONTH_MAP[name.toLowerCase()] = i + 1
  MONTH_MAP[name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()] = i + 1
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function ltrim(text: string): string {
  return text.replace(/\s{2,}/g, ' ').replace(/\u00a0/g, ' ').trim()
}

function cleanLines(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map(ltrim)
    .filter((l) => l.length > 0)
}

function parseDateFromLine(line: string): string | null {
  const numericRe = /\b(\d{1,2})\s*[/.,-]\s*(\d{1,2})\s*[/.,-]\s*(\d{2,4})\b/g
  for (const m of line.matchAll(numericRe)) {
    const dd = Number(m[1])
    const mo = Number(m[2])
    if (dd < 1 || dd > 31 || mo < 1 || mo > 12) continue
    let yy: number
    if (m[3].length === 4) {
      yy = Number(m[3])
      if (yy < 1900 || yy > 2100) continue
    } else {
      const n = Number(m[3])
      yy = (n < 70 ? 2000 : 1900) + n
    }
    return `${yy}-${pad2(mo)}-${pad2(dd)}`
  }
  const monthRe = /\b(\d{1,2})\s+(?:er\s+)?([a-zA-ZÀ-ÿ]+)\s+(\d{4})\b/g
  for (const m of line.matchAll(monthRe)) {
    const name = m[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const mo = MONTH_MAP[name]
    if (!mo) continue
    const dd = Number(m[1])
    const yy = Number(m[3])
    if (dd >= 1 && dd <= 31 && yy >= 1900 && yy <= 2100) {
      return `${yy}-${pad2(mo)}-${pad2(dd)}`
    }
  }
  return null
}

function firstDate(lines: string[]): string | null {
  for (const line of lines) {
    const d = parseDateFromLine(line)
    if (d) return d
  }
  return null
}

function isDelimited(text: string, start: number, end: number): boolean {
  const before = start === 0 ? '' : text[start - 1]
  const after = text[end]
  const isDelim = (c: string | undefined) => !c || /[\s,;)«»|€]/.test(c)
  return isDelim(before) && isDelim(after)
}

function lineTokens(line: string): Token[] {
  const out: Token[] = []
  for (const m of line.matchAll(MONEY_RE)) {
    const numPart = m[0].match(/\d+(?:[.,]\d{1,2})?/)
    if (!numPart) continue
    const value = parseFloat(numPart[0].replace(',', '.'))
    if (Number.isFinite(value)) out.push({ value, index: m.index ?? 0, currency: true })
  }
  const bareRe = /\b\d+(?:[.,]\d{1,2})?\b/g
  for (const m of line.matchAll(bareRe)) {
    const s = m.index ?? 0
    const e = s + m[0].length
    if (!isDelimited(line, s, e)) continue
    const isDecimal = /[.,]/.test(m[0])
    if (!isDecimal && m[0].replace(/\D/g, '').length > 4) continue
    const value = parseFloat(m[0].replace(',', '.'))
    if (Number.isFinite(value)) out.push({ value, index: s, currency: false })
  }
  return out.sort((a, b) => a.index - b.index)
}

function currencyOnly(line: string): Token[] {
  return lineTokens(line).filter((t) => t.currency)
}

const TTC_STRONG = /(?:TOTAL\s*TTC|NET\s*[ÀA]\s*PAYER|SOMME\s*[ÀA]\s*PAYER|[ÀA]\s*PAYER|RESTE\s*[ÀA]\s*REGLER)/i
const TTC_MEDIUM = /(?:MONTANT|PAY[ÉE]|PAYE|REGLEMENT|CB|DEBIT|CREDIT)/i

function findTTC(lines: string[]): number | null {
  const candidates: { value: number; weight: number }[] = []
  for (const line of lines) {
    const strong = TTC_STRONG.test(line)
    const medium = TTC_MEDIUM.test(line)
    if (!strong && !medium) continue
    const tokens = lineTokens(line)
    const marked = tokens.filter((t) => t.currency)
    const pool = marked.length ? marked : tokens
    if (!pool.length) continue
    const best = pool.reduce((a, b) => (b.value > a.value ? b : a))
    candidates.push({ value: best.value, weight: strong ? 3 : 2 })
  }
  if (!candidates.length) {
    let best: Token | undefined
    for (const line of lines) {
      for (const t of currencyOnly(line)) {
        if (!best || t.value > best.value) best = t
      }
    }
    return best ? best.value : null
  }
  const maxWeight = Math.max(...candidates.map((c) => c.weight))
  return Math.max(...candidates.filter((c) => c.weight === maxWeight).map((c) => c.value))
}

const HT_STRONG = /(?:TOTAL|BASE|MONTANT|FACTURE|NET)\s*H[IT]/i

function findExplicitHT(lines: string[]): number | null {
  for (const line of lines) {
    const m = line.match(HT_STRONG)
    if (!m || m.index === undefined) continue
    const tokens = lineTokens(line)
    const afterKw = tokens.filter((t) => t.index > m.index!)
    const marked = afterKw.filter((t) => t.currency)
    const pool = marked.length ? marked : afterKw.length ? afterKw : tokens
    if (!pool.length) continue
    return pool.reduce((a, b) => (b.value > a.value ? b : a)).value
  }
  return null
}

function inferHTByEquation(lines: string[], ttc: number): number | null {
  for (const line of lines) {
    const tokens: number[] = []
    for (const t of lineTokens(line)) {
      tokens.push(t.value)
      if (!t.currency && Number.isInteger(t.value) && t.value >= 100) tokens.push(t.value / 100)
    }
    if (tokens.length < 3) continue
    if (!tokens.some((v) => Math.abs(v - ttc) < 0.01)) continue
    let best: { ht: number; diff: number } | null = null
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const a = tokens[i]
        const b = tokens[j]
        const diff = Math.abs(a + b - ttc)
        if (diff <= 0.06 && (!best || diff < best.diff)) best = { ht: Math.max(a, b), diff }
      }
    }
    if (best) return best.ht
  }
  return null
}

function inferHTByTax(lines: string[], ttc: number): number | null {
  const taxes = new Map<number, number>()
  for (const line of lines) {
    for (const t of lineTokens(line)) {
      if (Math.abs(t.value - ttc) < 0.01) continue
      if (!t.currency && !/[.,]\d{1,2}\b/.test(line.slice(t.index)) && Number.isInteger(t.value)) continue
      if (t.value <= 0 || t.value >= ttc * 0.5) continue
      taxes.set(t.value, (taxes.get(t.value) ?? 0) + 1)
    }
  }
  if (taxes.size !== 1) return null
  const tax = taxes.keys().next().value as number
  return Math.round((ttc - tax) * 100) / 100
}

function findHT(lines: string[], ttc: number | null): number | null {
  const explicit = findExplicitHT(lines)
  if (explicit != null) return explicit
  if (ttc == null) return null
  return inferHTByEquation(lines, ttc) ?? inferHTByTax(lines, ttc)
}

const ENSEIGNE_SKIP = /[:/@€%]|^(?:TEL|TOL|CAISSE|CAISS|TICKET|SIRET|TVA|SIRE)\b|^[ÀA]\s|(?:somme|payer|règlement|reglement|total|montant|prix|tick)/i
const ENSEIGNE_RE = /^[\p{Lu}][\p{Lu}0-9&',.!\- ]*$/u

function findEnseigne(lines: string[]): string | null {
  const heading = /^[\p{Lu}\p{Ll}][\p{L}\p{N}&',.!\- ]*$/u
  for (const pass of [0, 1]) {
    for (const original of lines) {
      if (/^\d/.test(original.trim())) continue
      const line = original.trim().replace(/^[^A-Za-zÀ-ÿ]+/, '')
      if (line.length < 4) continue
      if (ENSEIGNE_SKIP.test(line)) continue
      if (pass === 0 && !ENSEIGNE_RE.test(line)) continue
      if (pass === 1 && !heading.test(line)) continue
      const words = line.split(/\s+/).length
      if (words < 1 || words > 7) continue
      return line
    }
  }
  return null
}

const STREET_RE = /(?:^|[\s(])\d{1,4}(?:\s+[A-Za-zÀ-ÿ0-9.'-]+)*?\s*\b(?:RUE|AVENUE|AV|BOULEVARD|BD|IMPASSE|CHEMIN|ALLÉE|ALLEE|QUAI|PLACE|ROUTE|RTE|SQUARE|CITÉ|CITE|LOTISSEMENT|HAMEU)\b/i
const ZIP_RE = /^\d{5}\s*[-—–]?\s*[a-zA-ZÀ-ÿ]/

function findStreet(line: string): string | null {
  const m = line.match(STREET_RE)
  if (!m) return null
  return line.slice(m.index).trim().replace(/^[^0-9]+/, '')
}

function findAdresse(lines: string[]): string | null {
  let street: string | null = null
  let zip: string | null = null
  for (const line of lines) {
    if (!street && findStreet(line)) street = findStreet(line)
    if (!zip && ZIP_RE.test(line)) zip = line
  }
  if (street && zip && street !== zip) return `${street}, ${zip}`
  return street ?? zip
}

export function inferCategory(text: string): string | null {
  const t = text.toLowerCase()
  const rules: [RegExp, string][] = [
    [/restaurant|restauration|déjeuner|dejeuner|dîner|diner|repas|pizza|kebab|menu/, 'Restaurant'],
    [/train|sncf|avion|taxi|uber|métro|metro|bus|tram|navette/, 'Transport'],
    [/hôtel|hotel|nuitée|nuit|chambre|airbnb|booking/, 'Hébergement'],
    [/essence|carburant|gasoil|diesel|sans plomb|sp95|sp98/, 'Essence'],
    [/péage|peage|autoroute|vinci|sanef/, 'Péage'],
    [/parking|stationnement/, 'Stationnement'],
    [/téléphone|telephone|mobile|forfait|facture free/, 'Téléphone'],
    [/matériel|materiel|ordinateur|écran|clavier|souris/, 'Matériel'],
  ]
  for (const [re, cat] of rules) {
    if (re.test(t)) return cat
  }
  return null
}

export function parseReceipt(text: string, filename = ''): ReceiptParse {
  const lines = cleanLines(text)
  const date = firstDate(lines) ?? undefined
  const enseigne = findEnseigne(lines) ?? undefined
  const adresse = findAdresse(lines) ?? undefined
  const montantTTC = findTTC(lines) ?? undefined
  const montantHT = findHT(lines, montantTTC ?? null) ?? undefined
  const category = inferCategory(text) ?? undefined
  const label = filename.replace(/\.[^.]+$/, '').trim() || 'Dépense'
  return { date, enseigne, adresse, montantTTC, montantHT, category, label }
}