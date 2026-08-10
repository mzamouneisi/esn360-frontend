# DOC_DEPLOY_FRONT_TO_GH_PAGES

Guide de déploiement du frontend **esn360-frontend** (React + Vite) sur **GitHub Pages** : branche `main`, dossier `docs/`. Le site appel le backend déployé sur Azure Container Apps.

## 1. Architecture cible

| Fichier | Rôle |
|---|---|
| `deploy_front_to_gh_pages.sh` | Script de déploiement complet : lint + tests + build + commit + push |
| `.env.production` | Variables de build de production (base path + URL API backend) |
| `vite.config.ts` | Lit `VITE_BASE_PATH` via `loadEnv` pour définir la `base` de Vite |
| `src/api/client.ts` | Appelle `${VITE_API_BASE_URL}/api/...` (vide en dev → proxy local `localhost:8080`) |
| `src/App.tsx` | Routeur avec `basename` = `import.meta.env.BASE_URL` |
| `src/main.tsx` | Restaure les liens profonds après la redirection `404.html` |
| `public/404.html` | Fallback SPA : redirige vers la racine du site pour les URLs inconnues |

Déploiement cible :

- URL publique : `https://mzamouneisi.github.io/esn360-frontend/`
- GitHub Pages sert le contenu du dossier `docs/` de la branche `main`
- Le backend appelé : `esn360-backend-v2-dev` (Azure Container Apps)

## 2. Prérequis

- Node.js ≥ 20.19 (22 recommandé) + npm
- Repo GitHub `mzamouneisi/esn360-frontend` avec les droits de push
- GitHub Pages activé une fois sur le repo (voir section 5)

## 3. Variables de build (.env.production)

| Variable | Valeur | Rôle |
|---|---|---|
| `VITE_BASE_PATH` | `/esn360-frontend/` | Base de Vite (chemins des assets et routeur) |
| `VITE_API_BASE_URL` | `https://esn360-backend-v2-dev.whiteforest-96ad5fb7.francecentral.azurecontainerapps.io` | URL du backend Azure |

> Note Windows (Git Bash) : ces valeurs sont lues depuis `.env.production`, ce qui évite la conversion MSYS des chemins `/...` (problème rencontré avec `VITE_BASE_PATH=/esn360-frontend/` passé en argument de commande).

## 4. Déploiement

Depuis la racine du projet :

```bash
./deploy_front_to_gh_pages.sh
```

Le script :

1. Vérifie qu'on est sur la branche `main` (seule branche servie par GitHub Pages)
2. `npm run lint` + `npm test`
3. `npm run build:pages` → `tsc -b && vite build --outDir docs`
4. Vérifie que `docs/index.html` référence bien la base `/esn360-frontend/`
5. `git add docs/`, commit puis `git push origin main`

Déploiement manuel équivalent :

```bash
npm run build:pages
git add docs/
git commit -m "GitHub Pages : build docs/ ($(date +'%Y-%m-%d %H:%M:%S'))"
git push origin main
```

## 5. Configuration GitHub Pages (une seule fois)

Sur GitHub → repo `esn360-frontend` → **Settings → Pages** :

- Source : **Deploy from a branch**
- Branch : `main`, folder : `/docs`

Chaque push de `docs/` met le site à jour automatiquement.

## 6. Backend : CORS et URL du frontend

Le backend doit autoriser l'origine `https://mzamouneisi.github.io` (sinon erreurs CORS dans la console du navigateur) :

- Variable `SECURITY_CORS_ALLOWED_ORIGINS` appliquée sur la Container App (définie par défaut dans `env.server.sh`)
- Variable `FRONTEND_URL` = `https://mzamouneisi.github.io/esn360-frontend/` (liens de reset de mot de passe)

Appliquer via un redéploiement :

```bash
export JAVA_HOME=/c/pgm/java/jdk-17.0.11
./deploy_app_docker.sh
```

## 7. Vérification

- Ouvrir `https://mzamouneisi.github.io/esn360-frontend/`
- Se connecter avec le compte de démo (`admin` / `Admin123!` si `SEED_DEMO_DATA=true`)
- Contrôler que les appels réseau partent vers l'URL du backend (onglet Network → `https://esn360-backend-v2-dev....azurecontainerapps.io`)

## 8. Dépannage

- **Le site affiche 404 sur une page interne** : GitHub Pages a renvoyé la page `404.html` (liens profonds) — vérifier que `docs/404.html` est présent et que la redirection mène bien à `/esn360-frontend/`.
- **Erreurs CORS** : vérifier que le backend a été redéployé avec `SECURITY_CORS_ALLOWED_ORIGINS` contenant `https://mzamouneisi.github.io`.
- **`VITE_API_BASE_URL` non prise en compte** : penser à relancer `npm run build:pages` (la valeur est embarquée au build, pas à la volée).
- **Base incorrecte dans `docs/index.html`** : contrôler `VITE_BASE_PATH=/esn360-frontend/` dans `.env.production` (le script refuse de pousser si la base est absente).
- **Appels API en `/api` (404)** : le build a été fait sans `.env.production` (mode dev) — relancer `npm run build:pages`.
