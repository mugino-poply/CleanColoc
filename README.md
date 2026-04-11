# 🏠 CleanColoc

Application web SaaS de gestion de colocation — tâches ménagères, dépenses partagées et rappels récurrents.

**Équipe :** Gaspard, Maelys, Hippolyte

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Backend | Node.js + Express.js + TypeScript |
| ORM | Sequelize |
| Base de données | PostgreSQL via Supabase |
| Tests | Jest + ts-jest + supertest |
| CI/CD | GitHub Actions |

---

## Prérequis

- [Node.js](https://nodejs.org/) v20 ou supérieur
- [npm](https://www.npmjs.com/) v10 ou supérieur
- Un projet [Supabase](https://supabase.com/) avec une base PostgreSQL

---

## Installation

### 1. Cloner le repo

```bash
git clone https://github.com/mugino-poply/CleanColoc.git
cd CleanColoc
```

### 2. Installer les dépendances

```bash
npm run setup
```

### 3. Configurer les variables d'environnement

**Backend** — créer `server/.env` en se basant sur `server/config/config.json.example` :

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Frontend** — créer `client/.env.development` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. Lancer les migrations

```bash
cd server
npx sequelize-cli db:migrate
```

### 5. Lancer le projet

```bash
# Depuis la racine — lance le backend et le frontend en parallèle
npm run dev
```

| Service | URL |
|---|---|
| Backend | http://localhost:3000 |
| Frontend | http://localhost:3001 |
| Swagger | http://localhost:3000/api-docs |

---

## Scripts disponibles

### Racine

| Commande | Description |
|---|---|
| `npm run dev` | Lance le backend et le frontend en parallèle |
| `npm run setup` | Installe les dépendances du backend et du frontend |

### Backend (`server/`)

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur en mode développement (hot reload) |
| `npm run build` | Compile le TypeScript |
| `npm test` | Lance les tests Jest |
| `npm run test:coverage` | Lance les tests avec rapport de couverture |

### Frontend (`client/`)

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur Next.js en développement |
| `npm run build` | Build de production (génère `out/`) |
| `npm run lint` | Vérifie le code avec ESLint |

---

## Structure du projet

```
cleancoloc/
├── .github/workflows/
│   ├── ci.yml              # Tests automatiques à chaque push
│   └── cd-frontend.yml     # Déploiement frontend sur push main
├── client/                 # Frontend Next.js
│   ├── app/                # App Router (pages et layouts)
│   └── .env.development    # Variables d'environnement (à créer)
├── server/                 # Backend Express
│   ├── src/
│   │   ├── config/         # database.ts, swagger.ts
│   │   ├── controllers/    # Logique métier
│   │   ├── middlewares/    # logger, errorHandler, checkIdParam
│   │   ├── models/         # Modèles Sequelize
│   │   ├── routes/         # Routes + annotations Swagger
│   │   └── tests/          # Fichiers *.test.ts
│   ├── migrations/         # Migrations Sequelize CLI
│   └── Dockerfile
└── package.json            # Racine : scripts dev et setup
```

---

## Conventions

- Toute logique métier réside dans les **controllers**, jamais dans les routes
- Toute nouvelle route doit être **annotée Swagger** dans son fichier de routes
- Toute modification de schéma DB → **nouvelle migration Sequelize CLI**, jamais de `sync()`
- Les variables sensibles passent par les **variables d'environnement**, jamais en dur dans le code
- Commits **atomiques et explicites** — la branche `main` est la branche de production

---

## CI/CD

- Chaque push déclenche l'exécution des **tests Jest** via `ci.yml`
- Chaque push sur `main` déclenche le **déploiement automatique** du frontend via `cd-frontend.yml`
- Les secrets sensibles (IP VPS, clé SSH, credentials DB) sont dans les **GitHub Secrets**
