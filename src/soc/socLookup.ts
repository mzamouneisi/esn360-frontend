import type { CompanyLookup } from '../api/auth'
import type { SocDto } from '../api/types'

export function socToCompanyLookup(soc: SocDto): CompanyLookup {
  return {
    name: soc.name ?? null,
    infosWeb: soc.infosWeb ?? null,
    siret: soc.siret ?? null,
    codeNaf: soc.codeNaf ?? null,
    gerant: soc.gerant ?? null,
    categorieEntreprise: soc.categorieEntreprise ?? null,
    dateCreation: null,
    dateFermeture: null,
    website: soc.website ?? null,
    tel: null,
    street: soc.address?.street ?? null,
    zipCode: soc.address?.zipCode ?? null,
    city: soc.address?.city ?? null,
    country: soc.address?.country ?? null,
  }
}
