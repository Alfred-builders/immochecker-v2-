# Imm v2

## Project Rules

<!-- Add project-specific instructions here -->


<!-- ALFREDHUB:STACK_CONFIG:START -->
<!-- Auto-generated from project stacks — DO NOT EDIT this section manually -->
<!-- Use the AlfredHub Admin or project settings to modify stacks -->

## Tech Stack

Ce projet utilise : **Railway, Fontshare, Gemini Design MCP, GitHub, Notion, Resend (Email)**

## Deployment — Railway

- **Hosting** : Railway (auto-deploy via GitHub push)
- **Builder** : Railpack (defaut 2026, Nixpacks deprecie)
- **Workflow** : `git push origin main` → deploy automatique
- **Variables** : Definies via MCP Railway (`variable_set` / `variable_bulk_set`)
- **Networking** : `service.railway.internal` pour les comms inter-services
- **Logs** : `deployment_logs` via MCP pour debugger

### Commandes utiles
- Deployer : `git push origin main` (auto-deploy)
- Verifier : utiliser MCP Railway `deployment_list` + `deployment_logs`
- Variables : `variable_set` / `variable_bulk_set` via MCP

### Configuration
## Typographie — Fontshare

- **Source** : [fontshare.com](https://www.fontshare.com) (gratuit, usage commercial)
- **Integration** : Via CDN `https://api.fontshare.com/v2/css?f[]=...`
- **Hierarchy** : Display (titres) + Body (texte) + Mono (code)

### Configuration
## Design — Gemini Design MCP

- **Outil** : `gemini-design-mcp` pour generer des composants frontend
- **Premier composant** : `create_frontend` avec `generateDesignSystem: true`
- **Suivants** : Reutiliser le design system via `create_frontend` / `modify_frontend` / `snippet_frontend`

### Configuration
## Source Control — GitHub

- **Workflow** : Feature branches → PR → Review → Merge
- **Commits** : Convention `type(scope): description`
- Types : `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Configuration
## Knowledge — Notion

- **Workspace** : Alfred Builders
- **Convention** : `{CODE} - US{numero} {description}`
- **Sync** : Les databases Notion sont synchronisees dans `knowledge/notion/`
- **Index** : `knowledge/notion/_index.md` = vue d'ensemble de toute la knowledge Notion
- **Routes** : `knowledge/notion/_routes.json` = carte des fichiers pour navigation rapide

### Ou trouver la knowledge Notion
- **Index general** : `knowledge/notion/_index.md`
- **Schemas DB** : `knowledge/notion/databases/{db-name}.md`
- **Pages DB** : `knowledge/notion/databases/{db-name}/{page-title}.md`
- **Pages standalone** : `knowledge/notion/pages/{page-title}.md`

### Regles knowledge Notion
- **TOUJOURS** lire `knowledge/notion/_index.md` en premier pour voir ce qui est disponible
- Les fichiers ont un frontmatter YAML avec `notion_id`, `properties`, `notion_url`
- Pour des donnees temps-reel, utiliser MCP Notion directement
- Pour de la knowledge locale (rapide), lire les fichiers markdown
- Ne JAMAIS modifier les fichiers `knowledge/notion/` manuellement — ils sont re-ecrases au sync

### Configuration
## Email — Resend

- **Service** : Resend API (`resend.com`)
- **SDK** : `resend` npm package
- **Templates** : React Email pour les templates HTML

### Configuration

<!-- ALFREDHUB:STACK_CONFIG:END -->

<!-- ALFREDHUB:GLOBAL_RULES:START -->
<!-- Auto-propagated from root CLAUDE.md — DO NOT EDIT this section manually -->

## Global Rules (AlfredHub Platform)

## Database Rules

### PostgreSQL on Railway — ALWAYS
- **NEVER use SQLite**. All data goes to Railway PostgreSQL.
- Connection: use `DATABASE_PUBLIC_URL` from `.env`
- Use `pg` Pool with connection pooling (max 20 connections)
- All queries use **parameterized statements** ($1, $2...) — NEVER string interpolation
- UUIDs for all primary keys (uuid_generate_v4())
- Timestamps always TIMESTAMPTZ (with timezone)
- JSONB for flexible/nested data (labels, metadata, settings, etc.)

### Dual Storage Pattern (DB + Files)
Projects are stored in **BOTH** places:
1. **Database** (`projects` table): metadata, settings, members, category, status
2. **Filesystem** (`/root/alfredhub/ProjectList/{slug}/`): actual project files, git repos

**On project creation:**
1. INSERT into `projects` table with slug, name, description, owner_id
2. `mkdir -p /root/alfredhub/ProjectList/{slug}`
3. If git URL provided: `git clone {url} /root/alfredhub/ProjectList/{slug}`

**On project archival (soft delete):**
1. UPDATE `projects` SET status='archived', archived_at=NOW() (no cascade, data preserved)
2. Filesystem untouched — project files remain on disk
3. Restore: UPDATE status='active', archived_at=NULL

### Schema (15 core tables)
See `server/db/schema.sql` for complete schema:
- `users` — Auth + profiles (roles: owner/admin/editor/viewer/member)
- `invitations` — Team invitations
- `projects` — Central entity, everything scoped to project
- `project_categories` — Organize projects
- `project_members` — Many-to-many user↔project
- `terminal_sessions` — PTY sessions (scoped to project)
- `session_shares` — Terminal sharing
- `tasks` — Kanban board items (5 columns)
- `task_comments` — Comments on tasks
- `client_tickets` — External client support tickets
- `environments` — Dev/Staging/Prod per project
- `deployments` — Deploy history with pipeline
- `knowledge_items` — Documents, specs, audio files
- `knowledge_artifacts` — AI-generated summaries/reports
- `mcp_connections` — MCP service integrations per project
- `agents` — AI agent definitions
- `agent_teams` — Agent groupings
- `agent_workflows` — Node-based workflows
- `project_agents` — Link agents to projects
- `roadmap_versions` — Version planning
- `roadmap_items` — Items in versions
- `activity_log` — All actions tracked
- `notifications` — User notifications
- `credentials` — Encrypted credential vault
- `project_messages` — Project chat
- `claude_sessions` — Claude Code sessions per project

---

## Security Rules

- **NEVER** store passwords in plain text — always bcryptjs hash
- **NEVER** interpolate user input into SQL — always parameterized queries
- **NEVER** expose DATABASE_URL to frontend
- All file paths resolved with `path.resolve()` — prevent directory traversal
- Project names validated: `/^[a-zA-Z0-9_.-]+$/`
- Credentials encrypted before storing in DB
- JWT verified on every request (middleware)
- Socket.IO connections authenticated via JWT in handshake
- Terminal PTY runs as non-root user (uid 1001)
- CLAUDE_* env vars stripped from terminal sessions

---

## Port Management
This VPS runs multiple projects. Always:
1. Check available ports: `ss -tlnp | grep LISTEN`
2. Use a port not already in use
3. Default backend: 3001
4. Frontend dev: Vite will auto-find available port
5. All services must use **alfredhub.io** domain — NEVER localhost

---

## Railway MCP — Global Rules

### Token & Configuration
- **Token API Railway (team)** : `d8da7435-b605-40ff-8e65-6c7b1a8e3bdf` — pour l'API GraphQL directe uniquement
- **Auth MCP** : le serveur MCP lit `~/.railway/config.json` (token de session CLI), PAS les env vars
- Config globale : `/root/.mcp.json` — PAS de bloc `env` pour Railway, le MCP utilise le token CLI
- Les projets dans `/root/alfredhub/ProjectList/` heritent automatiquement de la config globale

### Regles
- **NE PAS** mettre `RAILWAY_API_TOKEN` ou `RAILWAY_TOKEN` dans les blocs env des `.mcp.json` — le MCP utilise le token CLI
- **Si le MCP Railway ne fonctionne plus** : relancer `railway login` pour rafraichir le token de session CLI
- **Anciens tokens expires** : `021e9d09...` et `040dd105...` — ne plus utiliser
- Les commandes `/deploy-railway` et `/check-railway` sont disponibles dans le chat IA

### Workflow de deploiement (nouveau projet)
1. **Creer le projet** : `project_create` avec un nom clair
2. **Ajouter le service** : `service_create_from_repo` (GitHub) ou `service_create_from_image` (Docker)
3. **Configurer les variables** : `variable_set` ou `variable_bulk_set` (secrets, DATABASE_URL, NODE_ENV, etc.)
4. **Exposer le service** : `domain_create` pour generer un domaine Railway
5. **Verifier** : `deployment_list` + `deployment_logs` pour valider le deploy
6. **Health check** : `service_update` avec `healthcheckPath` si service critique

### Build system (2026)
- **Railpack** = builder par defaut (remplace Nixpacks). Images 38-77% plus petites.
- **Nixpacks** = deprecie, ne plus utiliser pour les nouveaux services
- **Dockerfile** = recommande pour les apps complexes (multi-stage, alpine)
- Railpack detecte automatiquement Node.js via `package.json` et execute `npm ci` → `npm run build` → `npm start`

### Variables d'environnement — bonnes pratiques
- Definir les variables **AVANT** le premier deploy
- Syntaxe de reference : `${{SERVICE.VAR}}` ou `${{shared.VAR}}`
- Utiliser shared variables pour eviter la duplication entre services
- Sceller les secrets (sealed variables) pour les API keys et tokens
- Private networking pour les comms inter-services : `service-name.railway.internal`

### Documentation complete
Voir le guide detaille : `/root/.claude/projects/-root/memory/railway-deployment-guide.md`

---

## Notion MCP — Global Rules

### Token & Configuration
- **Token Notion (Alfred Builders)** : `ntn_V7941599114mUTzq8G0K9frDF2ERNSxdOxX5UwtnWYt5YH`
- **Workspace** : Alfred Builders (`alfred-builders`)
- Ce token doit etre present dans `/root/.mcp.json` (config globale)
- Package MCP : `@notionhq/notion-mcp-server`

### Bases de donnees Notion
- **User Stories / Tasks** (ID: `2c51d95b-2f8a-800e-acac-f3670d50eab1`) — base principale de suivi
- **Documents** (ID: `2c41d95b-2f8a-81f7-9636-f5c19215b3dd`) — documents projet
- **Ressources utiles** (ID: `2f81d95b-2f8a-818a-be52-eee620e624cc`) — ressources internes
- **Base projets (vue)** : `https://www.notion.so/alfred-builders/2c41d95b2f8a8135ad45c88ff3ee4706?v=2e11d95b2f8a80f0afa3000ce7302951`
  - ⚠️ Non encore partagee avec l'integration API — a partager dans les connexions Notion

### Regles
- Quand on cree un projet dans AlfredHub, creer l'entree correspondante dans Notion (base User Stories / Tasks)
- Convention de nommage : `{CODE} - US{numero} {description}` (ex: `ARC - US001 Setup projet`)
- Toujours lier les documents projet dans la base Documents
- Les fichiers projet sont dans `/root/alfredhub/ProjectList/{slug}/`

### Documentation complete
Voir le guide detaille : `/root/.claude/projects/-root/memory/notion-config.md`

---

## Stack-Driven Claude Context — Mecanismes Globaux

### Principe : Chaque projet a son propre contexte Claude

Quand un utilisateur demande d'ajouter une technologie/stack a un projet (ex: "ajoute Railway avec cette DB"), les configurations doivent etre ecrites **dans le projet**, pas dans les fichiers globaux.

### Arborescence Claude Code d'un projet

```
ProjectList/{slug}/
├── CLAUDE.md                          ← Regles projet + sections stacks auto-generees
├── .mcp.json                          ← Serveurs MCP du projet
├── .claude/
│   ├── settings.json                  ← Permissions et config Claude Code
│   ├── skills/
│   │   └── {skill-name}/
│   │       └── SKILL.md              ← Slash commands auto-invocables
│   └── rules/
│       └── {rule-name}.md            ← Regles contextuelles (lazy-loaded par path)
└── knowledge/                         ← Documents du projet
```

### Comment Claude Code charge le contexte au demarrage

1. **Settings** : `.claude/settings.json` (permissions, modele)
2. **MCP** : `.mcp.json` (serveurs MCP du projet)
3. **Memory** : `~/.claude/projects/<hash>/memory/MEMORY.md` (200 premieres lignes)
4. **CLAUDE.md** : Remonte l'arborescence + charge les `.claude/rules/*.md`
5. **Skills** : Decouvre les `.claude/skills/*/SKILL.md` (descriptions au start, contenu on-demand)

### Markers dans CLAUDE.md

Le CLAUDE.md projet utilise des markers pour separer le contenu auto-genere du contenu utilisateur :

- `<!-- ALFREDHUB:STACK_CONFIG:START/END -->` — Sections generees par les stacks (ne pas editer manuellement)
- `<!-- ALFREDHUB:GLOBAL_RULES:START/END -->` — Regles globales propagees depuis le root

Le contenu utilisateur est **en dehors** de ces markers et n'est jamais ecrase.

### Quand un utilisateur demande d'ajouter un stack via AI Chat

Si l'utilisateur dit "ajoute Railway a ce projet" ou "configure la DB postgres://...", tu dois :

1. **Ecrire dans les fichiers du projet** (pas dans les fichiers globaux) :
   - `.claude/rules/{stack}.md` pour les regles
   - `.claude/skills/{skill}/SKILL.md` pour les slash commands
   - `.mcp.json` pour les serveurs MCP
   - `.claude/settings.json` pour les permissions
   - `CLAUDE.md` section entre les markers `STACK_CONFIG`

2. **Mettre a jour la DB** via l'API : `PUT /api/projects/{slug}/stacks`

3. **Ne JAMAIS ecrire dans** :
   - `/root/alfredhub/CLAUDE.md` (root — regles globales)
   - `~/.claude/CLAUDE.md` (global utilisateur)
   - Les fichiers d'autres projets

### API Stacks

- `GET /api/stacks` — Liste tous les stacks disponibles
- `GET /api/stacks/{slug}` — Stacks actifs d'un projet
- `PUT /api/projects/{slug}/stacks` — Met a jour les stacks + regenere les configs
- `POST /api/projects/{slug}/stacks/preview` — Preview sans ecrire
- `POST /api/projects/{slug}/stacks/sync` — Force la regeneration

### Format SKILL.md

```yaml
---
name: nom-du-skill
description: Quand et comment utiliser ce skill
allowed-tools: Bash(git *), mcp__railway__*
---

## Notion Deep Knowledge — Mecanismes

### Principe : chaque projet a sa knowledge Notion locale

Les databases et pages Notion sont synchronisees dans `{local_path}/knowledge/notion/` et indexees dans `knowledge_items` en DB. Claude peut lire les fichiers locaux sans re-faire de requete MCP.

### Arborescence Notion syncee

```
knowledge/notion/
├── _index.md                          ← LIRE EN PREMIER — vue d'ensemble + liens
├── _routes.json                       ← Carte machine des fichiers (pour navigation)
├── databases/
│   ├── {db-name}.md                  ← Schema complet (proprietes, types, options)
│   └── {db-name}/
│       ├── {page-title}.md           ← Page complete (frontmatter + proprietes + contenu + commentaires)
│       └── ...                       ← Toutes les pages, aucune exclue
└── pages/
    └── {standalone-page}.md          ← Pages hors database
```

### Regles absolues

1. **TOUJOURS lire `_index.md` en premier** — il contient la carte complete
2. **Les fichiers locaux sont la source principale** — MCP Notion pour les ecritures et le temps-reel
3. **JAMAIS modifier `knowledge/notion/`** manuellement — re-ecrase au sync
4. **Chaque page a un frontmatter YAML** avec `notion_id`, `notion_url`, `properties`, `last_synced`
5. **Aucune donnee perdue** : tous les types de blocs sont convertis, les inconnus sont serialises en JSON
6. **Les commentaires sont inclus** dans chaque page

### API Notion Sync

- `GET /api/notion-sync/{slug}` — Config Notion du projet
- `PUT /api/notion-sync/{slug}` — Configurer les databases/pages
- `POST /api/notion-sync/{slug}/sync` — Lancer un sync complet (async)
- `POST /api/notion-sync/{slug}/add` — Ajouter un lien Notion (auto-detect page/database)
- `GET /api/notion-sync/{slug}/status` — Statut du sync en cours
- `GET /api/notion-sync/{slug}/preview` — Lister les databases du workspace

### Quand un utilisateur mentionne Notion dans AI Chat

1. Chercher d'abord dans `knowledge/notion/` (rapide, local)
2. Si pas trouve, utiliser MCP Notion pour chercher en temps-reel
3. Proposer de lancer un sync si les donnees sont anciennes

---

## Comportement Claude — Regles de session

### Memoire projet obligatoire

Apres chaque feature, bugfix ou modification significative, Claude DOIT ecrire dans la memoire du projet :

1. **Creer/mettre a jour un fichier memoire** dans `~/.claude/projects/<project-hash>/memory/` :
   ```markdown
   ---
   name: feature-nom-court
   description: Description concise de ce qui a ete fait
   type: project
   ---

   Implemented [description].

   **Why:** [raison / demande utilisateur]
   **How to apply:** [ou trouver le code, fichiers modifies, decisions techniques]
   ```

2. **Mettre a jour le MEMORY.md** du projet (index) pour ajouter un pointeur vers le nouveau fichier

3. **Format du MEMORY.md** (index) :
   ```markdown
   # Project Memory

   - [feature-auth.md](feature-auth.md) — Systeme d'auth JWT avec refresh tokens
   - [bugfix-api-timeout.md](bugfix-api-timeout.md) — Fix timeout sur les requetes longues
   ```

### Ce qui doit etre memorise

- Chaque nouvelle feature implementee (nom, fichiers, decisions)
- Chaque bugfix significatif (cause, solution)
- Les choix d'architecture et leurs raisons
- Les configurations specifiques (URLs, IDs, credentials references)
- Les dependances ajoutees et pourquoi

### Ce qui ne doit PAS etre memorise

- Le contenu du code lui-meme (il est dans git)
- Les etapes de debug ephemeres
- Les informations deja dans le CLAUDE.md du projet

### Localisation de la memoire

Le hash du projet correspond au chemin encode : `~/.claude/projects/-root-alfredhub-ProjectList-{slug}/memory/`

Exemple pour check-my-flat : `~/.claude/projects/-root-alfredhub-ProjectList-check-my-flat/memory/`

<!-- ALFREDHUB:GLOBAL_RULES:END -->
