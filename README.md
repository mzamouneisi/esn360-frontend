# SOC360 — Frontend

Interface web de **SOC360** (anciennement ESN360), une application de gestion pour les sociétés de services du numérique : consultants, CRA, notes de frais, facturation, fiches de paie, documents RH, projets et clients.

## Stack

- **React 19** + **TypeScript** + **Vite 8**
- Routage : `react-router-dom` 7
- Styles : **Tailwind CSS 4** (via `@tailwindcss/vite`)
- Tests : **Vitest** + **Testing Library** (happy-dom / jsdom)
- Lint : **Oxlint**

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de dev Vite (proxy `/api` → `localhost:8080`) |
| `npm run lint` | Oxlint |
| `npm test` | Tests Vitest (une fois) |
| `npm run test:watch` | Tests Vitest (watch) |
| `npm run build` | Build de dev (`tsc -b && vite build`) |
| `npm run build:pages` | Build GitHub Pages dev → dossier `docs/` |
| `npm run build:pages:prod` | Build GitHub Pages prod → dossier `dist-prod/` |
| `npm run preview` | Prévisualisation du build |

## Architecture

- `src/api/` — appels HTTP vers le backend (`client.ts` gère le token JWT et le header `X-ESN-Id`, `types.ts` contient les DTO).
- `src/auth/` — contexte d'authentification et routes protégées :
  - `ProtectedRoute` (connecté), `AdminRoute` (ADMIN), `PublicOnlyRoute` (non connecté),
  - `PasswordGuard` (changement de mot de passe obligatoire),
  - `NotConsultantRoute` (bloque l'accès aux écrans de gestion pour les CONSULTANT).
- `src/esn/` — contexte et sélecteur de société : l'utilisateur (ADMIN, RESPONSIBLE_SOC, MANAGER) travaille sur une **société active** transmise au backend via `X-ESN-Id`.
- `src/layout/MainLayout.tsx` — navigation par rôle (les écrans de gestion sont masqués pour CONSULTANT).
- `src/pages/` — écrans : Dashboard, Clients, Projets, Missions, Consultants, Activités, CRA, Notes de frais, Facturation, Fiches de paie, Documents, Messages, Administration.

## Rôles

| Rôle | Périmètre |
|---|---|
| `ADMIN` | Super-administrateur (toutes sociétés, administration) |
| `RESPONSIBLE_SOC` | Gère sa/ses société(s), peut en inscrire de nouvelles |
| `MANAGER` | Gère les consultants et les activités de sa société |
| `CONSULTANT` | Saisie des CRA, notes de frais, documents |

## Déploiement

Voir [DOC_DEPLOY_FRONT_TO_GH_PAGES.md](DOC_DEPLOY_FRONT_TO_GH_PAGES.md) — deux sites GitHub Pages (dev et prod), chacun relié à son backend Azure :

```bash
./deploy_front_to_gh_pages.sh dev     # site dev (par défaut)
./deploy_front_to_gh_pages.sh prod    # site prod
```

## Environnement

- `.env.production` — build dev : base `/soc360-front-react/` + backend Azure dev
- `.env.production-prod` — build prod : base `/soc360-front-react-prod/` + backend Azure prod
