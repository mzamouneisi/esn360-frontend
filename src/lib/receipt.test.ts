import { describe, expect, it } from 'vitest'
import { inferCategory, parseReceipt } from './receipt'

const ALLO_PIZZA = `ALLO PIZZA DI NAPOLI
26 RUE DE BOISSY
91480 QUINCY SOUS SENART
Tel. 01 69 00 20 20
Caisse-01: DINAPOLI .D
16/01/2025 20:44
Ticket 00167150 16/01/2025
*% À EMPORTER 035 ++
1 MENU PROMO | 25.00
NET A PAYER TTC EURO 25.00
RESTE A REGLER 25.00
Tva Mnt-tva Base...HT Base..TTC
110%) 2.27 22.73 25.00
Nb articles:1 Nb Lig:1 Nb imp:1
Siret 810664094000 10<APE :56 10C>
Tva:FR49810664094-20250116 a 20h44`

const DAR_ZAMANE = `DAR, ZAMANE
53100 — HOMIREUIL - FRANCE
Tol © 09.63.09.23,38
samedi 04 janvier 2025 23:28:17 1123731
Ticket 13537
2 x REPAS
TOTAL HI 59.09 EUR
1 TVA 10% 59.09 5.41
Montant par personne : 32.50 EUR
REGLEMENTS
04/01/2025 CB 65.00 EUR
Merci de votre visite.`

const FREE_INVOICE = `Site Internet : mobile.free.fr
Service abonné au 3244 (appel gratuit depuis une ligne Free)
Forfait Free 5G EISI CONSULTING
Identifiant : 47055602 6 RUE DES 2 COMMUNES
91480 QUINCY SOUS SENART
e Facture n° 2293306919 du 29 janvier 2025
Total de la facture HT 16.66 €
TVA [20.00%] 3.33 €
Somme à payer TTC* 19.99 €`

const PARKING = `0
Î PARKING
SANS CONTACT
LE 16-01-25 À 19-42-27
ORY P4A CB CA
4093112
5201662800053 [
MONTANT 11,50 EUR
DEBIT
TICKET CLIENT
A CONSERVER
1,92 EUR
T0R(20,00%)
11,50 EUR CB EN428
16/01/25 19:42:15
Accueil parking 01 48622107`

const RESTAURATION_PASSION = `RESTAURATION DE PASSION
2 Bis AVENUE DE QUINCY
77380 COMBS LA VILLE
TEL:01.60.62.80.54 / 06.74..75.35.47
NOTE N° 6134
TICKET N° 41141
Mardi 14 Janvier 2025
STANDARD (SUR PLACE)
2 fepas complets) 34,00 €
PAYÉ 34,00 «
Siret : 832 914 642 00018`

const VAL_DE_SENART = `LE VAL DE SENART
10 rue des deux communes
91480 Quincy-sous-Senart
S1 28/01/2025 14:07:09 NS35205-1513
2 Repas Complet(s)
TOTAL TTC: 42.00 Eur AG. Zur
| Type TVA HT | wa | TC |
| 10%: 2455 | 245 27.00
| TVA 5,5% 1422 078 15.00
| Total | 3710 | 490 | 4200`

describe('parseReceipt', () => {
  it('reconnaît ALLO PIZZA DI NAPOLI', () => {
    const r = parseReceipt(ALLO_PIZZA, 'pizza.png')
    expect(r.enseigne).toBe('ALLO PIZZA DI NAPOLI')
    expect(r.adresse).toBe('26 RUE DE BOISSY, 91480 QUINCY SOUS SENART')
    expect(r.date).toBe('2025-01-16')
    expect(r.montantTTC).toBe(25)
    expect(r.montantHT).toBe(22.73)
    expect(r.category).toBe('Restaurant')
    expect(r.label).toBe('pizza')
  })

  it('reconnaît DAR, ZAMANE', () => {
    const r = parseReceipt(DAR_ZAMANE)
    expect(r.enseigne).toBe('DAR, ZAMANE')
    expect(r.adresse).toBe('53100 — HOMIREUIL - FRANCE')
    expect(r.date).toBe('2025-01-04')
    expect(r.montantTTC).toBe(65)
    expect(r.montantHT).toBe(59.09)
    expect(r.category).toBe('Restaurant')
  })

  it('reconnaît la facture Free', () => {
    const r = parseReceipt(FREE_INVOICE, 'facture_free.pdf')
    expect(r.enseigne).toBe('Forfait Free 5G EISI CONSULTING')
    expect(r.adresse).toBe('6 RUE DES 2 COMMUNES, 91480 QUINCY SOUS SENART')
    expect(r.date).toBe('2025-01-29')
    expect(r.montantTTC).toBe(19.99)
    expect(r.montantHT).toBe(16.66)
    expect(r.category).toBe('Téléphone')
    expect(r.label).toBe('facture_free')
  })

  it('reconnaît le ticket de parking', () => {
    const r = parseReceipt(PARKING)
    expect(r.enseigne).toBe('Î PARKING')
    expect(r.date).toBe('2025-01-16')
    expect(r.montantTTC).toBe(11.5)
    expect(r.montantHT).toBe(9.58)
    expect(r.category).toBe('Stationnement')
  })

  it('reconnaît RESTAURATION DE PASSION', () => {
    const r = parseReceipt(RESTAURATION_PASSION)
    expect(r.enseigne).toBe('RESTAURATION DE PASSION')
    expect(r.adresse).toBe('2 Bis AVENUE DE QUINCY, 77380 COMBS LA VILLE')
    expect(r.date).toBe('2025-01-14')
    expect(r.montantTTC).toBe(34)
    expect(r.category).toBe('Restaurant')
  })

  it('reconnaît LE VAL DE SENART', () => {
    const r = parseReceipt(VAL_DE_SENART)
    expect(r.enseigne).toBe('LE VAL DE SENART')
    expect(r.adresse).toBe('10 rue des deux communes, 91480 Quincy-sous-Senart')
    expect(r.date).toBe('2025-01-28')
    expect(r.montantTTC).toBe(42)
    expect(r.montantHT).toBe(37.10)
    expect(r.category).toBe('Restaurant')
  })

  it('gère le texte OCR simple sans ticket structuré', () => {
    const r = parseReceipt('Restaurant McDo 25,50 € le 12/03/2026', 'facture.png')
    expect(r.date).toBe('2026-03-12')
    expect(r.montantTTC).toBe(25.5)
    expect(r.montantHT).toBeUndefined()
    expect(r.enseigne).toBeUndefined()
    expect(r.category).toBe('Restaurant')
    expect(r.label).toBe('facture')
  })

  it('ne confond pas les numéros de ticket avec des dates ou montants', () => {
    const r = parseReceipt('NOTE N° 6134\nTICKET N° 41141\n00 00 00 00 00\n31123255 26/12/2024\nSomme à payer 99,00 EUR')
    expect(r.date).toBe('2024-12-26')
    expect(r.montantTTC).toBe(99)
    expect(r.enseigne).toBeUndefined()
  })
})

describe('inferCategory', () => {
  it('catégorise les tickets exemples', () => {
    expect(inferCategory(ALLO_PIZZA)).toBe('Restaurant')
    expect(inferCategory(DAR_ZAMANE)).toBe('Restaurant')
    expect(inferCategory(FREE_INVOICE)).toBe('Téléphone')
    expect(inferCategory(PARKING)).toBe('Stationnement')
    expect(inferCategory(RESTAURATION_PASSION)).toBe('Restaurant')
    expect(inferCategory(VAL_DE_SENART)).toBe('Restaurant')
  })
})