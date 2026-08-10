# DOC_DEPLOY_FRONT_TO_GH_PAGES

Guide de déploiement du frontend **esn360-frontend** (React + Vite) sur **GitHub Pages** : branche `main`, dossier `docs/`. Le site appelle le backend déployé sur Azure Container Apps.

**Deux sites GitHub Pages distincts** (dev et prod) : chacun appelle son propre backend Azure. Le build est paramétré par un mode Vite + un fichier `.env` dédié.

## 1. Architecture cible

| Fichier | Rôle |
|---|---|
| `deploy_front_to_gh_pages.sh [dev\|prod]` | Script de déploiement complet : lint + tests + build + commit + push |
| `.env.production` | Build **dev** : base path + URL du backend dev |
| `.env.production-prod` | Build **prod** : base path + URL du backend prod |
| `vite.config.ts` | Lit `VITE_BASE_PATH` via `loadEnv` pour définir la `base` de Vite |
| `src/api/client.ts` | Appelle `${VITE_API_BASE_URL}/api/...` (vide en dev → proxy local `localhost:8080`) |
| `src/App.tsx` | Routeur avec `basename` = `import.meta.env.BASE_URL` |
| `src/main.tsx` | Restaure les liens profonds après la redirection `404.html` |
| `public/404.html` | Fallback SPA : redirige vers la racine du site pour les URLs inconnues |

Deux sites cibles :

| Cible | Dépôt GitHub | URL publique | Backend appelé |
|---|---|---|---|
| **dev** | `mzamouneisi/esn360-frontend` | `https://mzamouneisi.github.io/esn360-frontend/` | `esn360-backend-v2-dev` (Azure Container Apps) |
| **prod** | `mzamouneisi/esn360-frontend-prod` | `https://mzamouneisi.github.io/esn360-frontend-prod/` | `esn360-backend-v2-prod` (Azure Container Apps) |

Chaque dépôt sert le contenu de son dossier `docs/` de la branche `main` (GitHub Pages).

## 2. Prérequis

- Node.js ≥ 20.19 (22.12+ recommandé) + npm
- Repo GitHub `mzamouneisi/esn360-frontend` avec les droits de push (site dev)
- Repo GitHub `mzamouneisi/esn360-frontend-prod` à créer (site prod) avec les droits de push
- GitHub Pages activé une fois sur chaque repo (voir section 5)

## 3. Variables de build

### Site dev — `.env.production`

| Variable | Valeur | Rôle |
|---|---|---|
| `VITE_BASE_PATH` | `/esn360-frontend/` | Base de Vite (chemins des assets et routeur) |
| `VITE_API_BASE_URL` | `https://esn360-backend-v2-dev.whiteforest-96ad5fb7.francecentral.azurecontainerapps.io` | URL du backend Azure dev |

### Site prod — `.env.production-prod`

| Variable | Valeur | Rôle |
|---|---|---|
| `VITE_BASE_PATH` | `/esn360-frontend-prod/` | Base de Vite (chemins des assets et routeur) |
| `VITE_API_BASE_URL` | `https://esn360-backend-v2-prod.whiteforest-96ad5fb7.francecentral.azurecontainerapps.io` | URL du backend Azure prod (à vérifier après le 1er déploiement du backend) |

> Note Windows (Git Bash) : ces valeurs sont lues depuis les fichiers `.env.*`, ce qui évite la conversion MSYS des chemins `/...` (problème rencontré avec `VITE_BASE_PATH=/esn360-frontend/` passé en argument de commande).

## 4. Déploiement

Depuis la racine du projet :

```bash
# Site dev (défaut) — pousse docs/ sur esn360-frontend
./deploy_front_to_gh_pages.sh
# ou explicitement
./deploy_front_to_gh_pages.sh dev

# Site prod — build dist-prod/ puis pousse docs/ sur esn360-frontend-prod
./deploy_front_to_gh_pages.sh prod
```

Si le dépôt du site prod a un autre nom, définir `PROD_PAGES_REPO` :

```bash
PROD_PAGES_REPO=git@github.com:USER/REPO.git ./deploy_front_to_gh_pages.sh prod
```

Le script :

1. Vérifie qu'on est sur la branche `main`
2. `npm run lint` + `npm test`
3. Build selon la cible :
   - dev : `npm run build:pages` → `tsc -b && vite build --outDir docs` (mode `production`)
   - prod : `npm run build:pages:prod` → `tsc -b && vite build --mode production-prod --outDir dist-prod`
4. Vérifie que `docs/index.html` (ou `dist-prod/index.html`) référence bien la base attendue
5. dev : `git add docs/`, commit puis `git push origin main`
6. prod : clone le dépôt prod dans un dossier temporaire, copie le build dans `docs/`, commit puis push

Déploiement manuel équivalent (dev) :

```bash
npm run build:pages
git add docs/
git commit -m "GitHub Pages : build docs/ ($(date +'%Y-%m-%d %H:%M:%S'))"
git push origin main
```

Déploiement manuel équivalent (prod) :

```bash
npm run build:pages:prod
# puis copier dist-prod/ dans le dossier docs/ du dépôt esn360-frontend-prod et pousser
```

## 5. Configuration GitHub Pages (une seule fois, par dépôt)

Sur GitHub → repo concerné → **Settings → Pages** :

- Source : **Deploy from a branch**
- Branch : `main`, folder : `/docs`

Chaque push de `docs/` met le site à jour automatiquement.

## 6. Backend : CORS et URL du frontend

Le backend doit autoriser l'origine `https://mzamouneisi.github.io` (sinon erreurs CORS dans la console du navigateur) :

- Variable `SECURITY_CORS_ALLOWED_ORIGINS` appliquée sur la Container App (définie par défaut dans `env.server.sh`)
- Variable `FRONTEND_URL` (liens de reset de mot de passe) :
  - backend **dev** : `https://mzamouneisi.github.io/esn360-frontend/`
  - backend **prod** : `https://mzamouneisi.github.io/esn360-frontend-prod/`

Ces valeurs par défaut sont définies dans `env.server.sh` (blocs `psgsql_azure` et `psgsql_azure_prod`), puis appliquées via un redéploiement :

```bash
export JAVA_HOME=/c/pgm/java/jdk-17.0.11
./deploy_app_docker.sh
```

## 7. Vérification

- Ouvrir `https://mzamouneisi.github.io/esn360-frontend/` (dev) ou `https://mzamouneisi.github.io/esn360-frontend-prod/` (prod)
- Se connecter avec le compte de démo (`admin` / `Admin123!` si `SEED_DEMO_DATA=true`)
- Contrôler que les appels réseau partent vers l'URL du backend correspondant (onglet Network → `https://esn360-backend-v2-<dev|prod>....azurecontainerapps.io`)

## 8. Dépannage

- **Le site affiche 404 sur une page interne** : GitHub Pages a renvoyé la page `404.html` (liens profonds) — vérifier que `docs/404.html` est présent et que la redirection mène bien à la racine du site concerné.
- **Erreurs CORS** : vérifier que le backend a été redéployé avec `SECURITY_CORS_ALLOWED_ORIGINS` contenant `https://mzamouneisi.github.io`.
- **`VITE_API_BASE_URL` non prise en compte** : penser à relancer le build (la valeur est embarquée au build, pas à la volée).
- **Base incorrecte dans `docs/index.html`** : contrôler `VITE_BASE_PATH` dans le bon fichier `.env` (le script refuse de pousser si la base est absente).
- **Appels API en `/api` (404)** : le build a été fait sans `.env.*` de production (mode dev) — relancer `npm run build:pages` ou `npm run build:pages:prod`.
- **Le site prod affiche le contenu dev** : vérifier qu'on a bien lancé `./deploy_front_to_gh_pages.sh prod` (mode `production-prod`, fichier `.env.production-prod`), pas la cible dev.
