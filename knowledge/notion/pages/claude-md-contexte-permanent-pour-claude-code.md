---
notion_id: "32f1d95b-2f8a-8160-bb56-f3726e7caa5f"
notion_url: "https://www.notion.so/CLAUDE-md-Contexte-Permanent-pour-Claude-Code-32f1d95b2f8a8160bb56f3726e7caa5f"
last_synced: "2026-04-07T09:51:45.421Z"
created: "2026-03-26T13:17:00.000Z"
last_edited: "2026-03-26T17:08:00.000Z"
properties:
  title: " CLAUDE.md — Contexte Permanent pour Claude Code"
---

#  CLAUDE.md — Contexte Permanent pour Claude Code

| Propriete | Valeur |
|-----------|--------|

Ce fichier sert de **contexte permanent** pour Claude Code. Il centralise toutes les informations nécessaires au développement de la webapp ImmoChecker.
Copier le contenu de cette page dans le fichier `CLAUDE.md` à la racine du repo, ou le donner en contexte à Claude Code au début de chaque session.
Dernière mise à jour : 26 mars 2026.

---


# 1. Vision Produit
**ImmoChecker** est un outil de création d'états des lieux (EDL) et d'inventaires pour l'immobilier. Le produit se compose d'une **webapp back-office** (admin/gestionnaire) et d'une **app mobile/tablette** (technicien terrain). Ce fichier de contexte concerne **uniquement la webapp**.
L'objectif est de remplacer Immopad, fiabiliser les données, fluidifier l'opérationnel et préparer une commercialisation SaaS.
**ImmoChecker n'est PAS un logiciel de gestion locative.** L'occupation des logements n'est pas gérée.
> **Document de référence complet** : [Vision Fonctionnelle Cible — ImmoChecker V1](https://www.notion.so/3131d95b2f8a8146af90c1a3bb0ac08f)

## 3 types de workspace
- `societe_edl` — Société d'EDL (ex: FlatChecker). Cas le plus complexe : missions, techniciens, mandataires.
- `bailleur` — Bailleur direct. Simplifié : EDL sans mission possible, pas de mandataire.
- `agence` — Agence immobilière. Gestion interne, onglet Mandataire masqué.

## Périmètre webapp (Lot 1)
La webapp ne descend **jamais en dessous du niveau **`**EDL_Inventaire**`. Les données de saisie terrain (pièces, items, photos) sont consultables uniquement via le PDF/Web généré. Le back-office **pilote et consulte**, la tablette **saisit**.

---


# 2. Architecture de Données
> **Document de référence complet** : [Architecture de Données — ImmoChecker V1](https://www.notion.so/3131d95b2f8a81c09630df33a2b7889c)
> 
> **Attributs détaillés par table (types, contraintes, notes)** : [Attributs par Table — ImmoChecker V1](https://www.notion.so/3131d95b2f8a81649209fa1f42bf2275)
> 
> **Base de données attributs** : [DB Attributs par Table](https://www.notion.so/e3a1c51cb6f94761adece3b9d916f3e0)

## Couches du modèle (28 tables)
**Couche Auth** : `Workspace`, `Utilisateur`, `WorkspaceUser` (pivot)
**Couche Tiers** : `Tiers`, `TiersOrganisation` (pivot), `LotProprietaire` (pivot), `EDLLocataire` (pivot)
**Couche Patrimoine** : `Batiment`, `AdresseBatiment`, `Lot`, `AccesLot`, `CompteurLot`, `ReleveCompteur`, `ValeurReleveCompteur`
**Couche Opérationnelle** : `Mission`, `MissionTechnicien` (pivot), `CleMission`, `IndisponibiliteTechnicien`, `EDL_Inventaire`, `PieceEDL`, `EvaluationItem`, `Photo`
**Couche Catalogue** : `TypePiece`, `CatalogueItem`, `ValeurReferentiel`, `ConfigCritereCategorie`, `ConfigCritereItem`, `TemplatePieceItem` (pivot)
**Couche Préférences** : `UserPreference`

---


# 3. Décisions d'Architecture Clés
Ces décisions sont dispersées dans les EPICs et les docs de référence. Elles sont centralisées ici pour Claude Code.

## Séparation Auth / Métier
- `Utilisateur` = personne authentifiée (identité humaine, auth JWT)
- `Tiers` = entité juridique/documentaire (propriétaire, locataire, mandataire)
- **Pas de pont User ↔ Tiers** : `WorkspaceUser` n'a PAS de `tiers_id`. La table Tiers est réservée aux stakeholders autour des lots.
- La **société réalisatrice** d'un EDL est **dérivée du Workspace** (nom, SIRET, adresse), pas d'un Tiers.

## Rôles portés par les relations
- Un Tiers n'est ni "propriétaire" ni "locataire" intrinsèquement — c'est la FK qui qualifie le rôle.
- Un même Tiers peut jouer plusieurs rôles (proprio ET locataire).

## Tables pivots pour le N:N
- `WorkspaceUser` : user ↔ workspace (rôle)
- `TiersOrganisation` : personne physique ↔ personne morale (fonction)
- `LotProprietaire` : lot ↔ tiers propriétaire(s) (supporte indivision)
- `EDLLocataire` : EDL ↔ tiers locataire(s) (supporte colocation)
- `MissionTechnicien` : mission ↔ user technicien (1 en V1, pivot pour anticiper multi)
- `TemplatePieceItem` : type de pièce ↔ catalogue item

## Multi-tenant
- Isolation par `workspace_id` sur toutes les tables métier.
- JWT avec gestion workspaces et permissions.
- 3 rôles : Admin / Gestionnaire / Technicien.

## Patrimoine
- Structure : **Bâtiment → Lot** (étage = simple champ du lot)
- Maison individuelle = 1 Bâtiment + 1 Lot
- `Lot.mandataire_id → Tiers` : FK directe (1 seul mandataire par lot)
- `code_acces` migré vers `EDL_Inventaire` (change à chaque intervention)
- `num_cave`, `num_parking` restent sur le Lot (données stables)
- Compteurs : section retirée de la fiche lot — gérés uniquement côté EDL tablette

## Templates & Catalogue
- **Pas de table Section** — la catégorie est un attribut enum de `CatalogueItem`
- Templates par **type de pièce** (pas par type de bien)
- 3 niveaux : plateforme → workspace → terrain
- Un item est soit EDL soit Inventaire (champ `contexte`), pas les deux
- Sous-items via self-ref `parent_item_id` (profondeur max 2)
- Critères d'évaluation par **catégorie** (pas par item) avec overrides ponctuels
- 8 critères fixes : état_général, propreté, photos, caractéristiques, couleur, dégradations, fonctionnement, quantité
- 4 niveaux d'exigence : masqué / optionnel / recommandé / obligatoire

## Missions
- 1 mission = 1 lot (non modifiable après création)
- Statut simplifié : `planifiee | assignee | terminee | annulee`
- **Auto-terminaison** : quand tous les EDL liés sont signés
- **Verrouillage post-terminaison** : date/heure/technicien en lecture seule. Seuls commentaire + clés modifiables.
- **Annulation bloquée** si mission terminée (EDL signés = documents légaux)
- Colocation : bail collectif (1 EDL, N locataires) ou bails individuels (N EDL)
- `CleMission` FK vers `edl_id` (pas mission_id) — colocation gérée
- Indisponibilités technicien : créneaux + récurrence style Google Calendar

## Interface
- **Édition inline retirée** — toute modification passe par fiche détail ou drawer
- **Filtres rapides en dropdown compact** (pattern transversal toutes les vues)
- **Suppression onglet Lots** — lots accessibles uniquement via drill-down bâtiment ou recherche globale
- **Colonne agrégée "Nom / Raison sociale"** sur tous les onglets Tiers

---


# 4. Navigation Back-office
```javascript
📊 OPÉRATIONNEL
  ├── Tableau de bord (EPIC 14)
  └── Missions (EPIC 13)

📁 RÉFÉRENTIEL
  ├── Parc immobilier — Bâtiments & Lots (EPIC 1)
  └── Tiers (EPIC 2)

⚙️ ADMINISTRATION
  ├── Paramètres (EPIC 11)
  │   ├── Informations workspace
  │   ├── Utilisateurs & Rôles
  │   ├── Templates / Pièces (EPIC 4)
  │   ├── Catalogue d'items (EPIC 4)
  │   ├── Paramétrage Critères (EPIC 4)
  │   └── Référentiels / Tags (EPIC 4)
  └── API & Intégrations (EPIC 10)
```
Le **technicien** n'a accès qu'à l'app mobile. Pas d'interface desktop.

---


# 5. Cycles de Vie

## Mission
`Planifiée` → `Assignée` → `Terminée` (auto) | `Annulée`

## EDL / Inventaire
`Brouillon` → `Signé` | `Infructueux`

## Statuts séparés sur la Mission
- `statut` : planifiee | assignee | terminee | annulee
- `statut_rdv` : a_confirmer | confirme | reporte
- `MissionTechnicien.statut_invitation` : en_attente | accepte | refuse

---


# 6. Stack Technique

## Frontend (Webapp Back-office)
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix primitives)
- React Router 6 (routing SPA)
- TanStack Query (React Query) pour le server state
- Recharts (graphiques dashboard)
- Lucide React (icônes)
- Fontshare (typographie : Display + Body + Mono)

## Backend
- Node.js + Express (ESM modules)
- PostgreSQL sur Railway (pg driver, Pool, max 20 connexions)
- JWT (jsonwebtoken) + bcryptjs pour l'auth
- Zod (validation des schemas côté backend et frontend)
- Resend (emails transactionnels — invitations, notifications)

## Infrastructure
- Railway (hosting webapp + PostgreSQL)
- GitHub (repo + CI/CD via Railway auto-deploy)
- Notion (specs, suivi, knowledge sync)
> 
> 

---


# 7. Conventions de Code

## Structure du projet
```plain text
/src
  /components         ← Composants UI réutilisables
  /components/ui      ← shadcn/ui (ne pas modifier)
  /features           ← Feature modules
    /{feature}
      /components     ← Composants spécifiques
      /hooks          ← Hooks custom
      /api.ts         ← Appels API (React Query)
      /types.ts       ← Types TypeScript
  /layouts            ← Layout sidebar + topbar
  /lib                ← Utilitaires (api client, cn, formatters)
  /hooks              ← Hooks globaux
/server
  /routes             ← Express routes
  /services           ← Business logic
  /db                 ← Schema, migrations, pool
  /middleware          ← Auth JWT, validation
```

## Conventions de nommage
- Composants React : PascalCase (BuildingList.tsx)
- Fonctions / hooks : camelCase (useBuildings, formatDate)
- Colonnes DB / API JSON : snake_case (workspace_id, created_at)
- Fichiers features : kebab-case (building-list.tsx, use-buildings.ts)
- Types TS : PascalCase avec suffixe (Building, CreateBuildingInput, BuildingResponse)

## API REST
- Endpoints : /api/{resource} (pluriel) — /api/batiments, /api/tiers, /api/missions
- Réponses JSON : { data, meta? } pour les listes, objet direct pour les détails
- Erreurs : { error: string, code: string, details?: any }
- Pagination : cursor-based (?cursor=xxx&limit=50)
- Validation : Zod côté backend (middleware), Zod + React Hook Form côté frontend

## Dates & i18n
- Stockage : ISO 8601, TIMESTAMPTZ en base
- Affichage : format fr-FR (date-fns/locale/fr)
- UI en français, code et API en anglais
- IDs : UUID v4 partout (uuid_generate_v4() côté DB)

---


# 7b. Interdictions V1 — Ce que ImmoChecker ne fait PAS
Ces règles sont non-négociables en V1. Elles évitent le scope creep et clarifient les limites du produit.
- PAS de gestion locative — l'occupation des logements n'est pas gérée
- PAS d'édition inline sur les tableaux — toute modification passe par fiche détail ou drawer
- PAS de suppression hard delete — archivage uniquement (soft delete)
- PAS de section compteurs sur la fiche lot — gérés uniquement côté EDL tablette
- PAS de table Section pour les items — la catégorie est un enum sur CatalogueItem
- PAS de tiers_id sur WorkspaceUser — table Tiers = stakeholders lot uniquement
- PAS de modification du lot sur une mission après création
- PAS d'annulation de mission si terminée — EDL signés = documents légaux immuables
- PAS d'onglet Lots séparé — lots accessibles uniquement via drill-down bâtiment ou recherche
- PAS de drag & drop sur le Kanban missions en V1
- PAS de données de saisie terrain dans la webapp — le back-office consulte via PDF/Web uniquement

---


# 7c. Auth & Sécurité — Détails d'implémentation

## Stratégie JWT
- Access token : 15-30 min, contient { userId, email, workspaceId, role }
- Refresh token : 7 jours, httpOnly cookie (web) / secure storage (mobile)
- Silent refresh si access token expiré. Redirect /login si refresh expiré.

## Inscription & Invitations
- Pas de sign-up public en V1 — inscription uniquement par invitation
- Invitation expire après 7 jours. Password : 8 chars + 1 majuscule + 1 chiffre
- Lockout : 10 tentatives échouées → blocage 15 min

## Multi-workspace
- 1 seul workspace actif à la fois (stocké dans JWT). Switch = refresh JWT + reload données.
- Si 2+ workspaces : page de sélection après login. Workspace switcher dans le header.
- Visibilité conditionnelle : onglet Mandataire masqué si bailleur/agence. EDL direct (sans mission) si bailleur.

---


# 7d. Transitions d'état — Mission & EDL
planifiée → assignée (technicien accepte) → terminée (AUTO quand tous EDL signés) | annulée (admin + motif obligatoire, BLOQUÉE si terminée)
Verrouillage post-terminaison : date/heure/technicien/statut_rdv = LECTURE SEULE. Commentaire + CleMission restent modifiables.
EDL : brouillon → signé (trigger auto-terminaison mission) | infructueux (accès refusé). Signé = document légal immuable.

---


# 7e. Workflow Colocation
Choix type de bail quand 2+ locataires dans création mission :
- Bail Individuel (défaut) : N locataires → N EDL séparés. Duplication sur tablette. Auto-terminaison attend tous les N EDL.
- Bail Collectif : N locataires → 1 EDL signé par tous (pivot EDLLocataire N:1).
- Entrée + Sortie possible sur même mission. CleMission FK vers edl_id (pas mission_id) — chaque locataire a ses propres clés.

---


# 7f. Patterns UI partagés
- Record Picker enrichi : Lot (nom+adresse+proprio+étage), Bâtiment (désignation+adresse), Tiers (nom+type+email). Création inline en sous-modal.
- Filtres rapides : dropdowns compacts (Période, Technicien, Statut) — pattern transversal toutes les vues.
- Drawer latéral : panneau glissant droit pour détail mission. Lecture seule si terminée (sauf commentaire+clés).
- Colonnes configurables : bouton Colonnes → toggle show/hide. Persisté par user+table dans UserPreference.
- Calendrier admin : semaine (cartes pastels) + mini-cal mensuel (sidebar). Indispos = blocs gris. Pas de création par clic créneau.
- Vue carte : markers colorés par activité (bleu/vert/gris), clusters, popup détail. Seuls bâtiments géocodés visibles.

---


# 7g. Enums & Constantes métier
Workspace.type_workspace : societe_edl | bailleur | agence
WorkspaceUser.role : admin | gestionnaire | technicien
Mission.statut : planifiee | assignee | terminee | annulee
Mission.statut_rdv : a_confirmer | confirme | reporte
MissionTechnicien.statut_invitation : en_attente | accepte | refuse
EDL_Inventaire.statut : brouillon | signe | infructueux
EDL_Inventaire.sens : entree | sortie — type_bail : individuel | collectif
CleMission.type_cle : cle_principale | badge | boite_aux_lettres | parking | cave | digicode | autre
CleMission.statut : remise | a_deposer | deposee
Batiment.type : immeuble | maison | local_commercial | mixte
Tiers.type : physique | morale
CatalogueItem.contexte : edl | inventaire — Photo.entity_type : item | cle | piece | compteur
ConfigCritereCategorie.niveau_exigence : masque | optionnel | recommande | obligatoire
Mission.reference : auto-généré M-{YYYY}-{XXXX} (ex: M-2026-0001)
Pagination API : cursor-based, limit défaut 50 / max 100, réponse { data, meta: { cursor, has_more, total } }

# 8. Spécifications Détaillées (liens)
> 📂 Pour Claude Code : les fichiers sont synchronisés localement dans knowledge/notion/pages/. Chemins directs :
• Spécification Items → knowledge/notion/pages/[specification-items-criteres-d-evaluation-templates-edl-inventaire.md](http://specification-items-criteres-d-evaluation-templates-edl-inventaire.md/)
• Notifications → knowledge/notion/pages/[notifications-specification.md](http://notifications-specification.md/)
• Arbitrage Items → knowledge/notion/pages/[arbitrage-modele-de-saisie-des-items-edl.md](http://arbitrage-modele-de-saisie-des-items-edl.md/)
• Retours prototype → knowledge/notion/pages/[synthese-retours-prototype-back-office-mars-2026.md](http://synthese-retours-prototype-back-office-mars-2026.md/)
• Vision fonctionnelle → knowledge/notion/pages/[vision-fonctionnelle-cible-immochecker-v1.md](http://vision-fonctionnelle-cible-immochecker-v1.md/)
• Architecture données → knowledge/notion/pages/[architecture-de-donnees-immochecker-v1.md](http://architecture-de-donnees-immochecker-v1.md/)
• Hub ressources → knowledge/notion/pages/[hub-de-ressources-immochecker.md](http://hub-de-ressources-immochecker.md/)
Documents de spécification à consulter pour les détails fonctionnels :
**📋 Spécification Items, Critères & Templates** : [Ouvrir](https://www.notion.so/3251d95b2f8a81d9b0befe4d40f7fb68)
Détail complet des items, sous-items, catégories, critères par catégorie, templates pièces-items. Contient les DB Items (~155 items) et Pièces (~30 types).
**🔔 Notifications — Spécification** : [Ouvrir](https://www.notion.so/3271d95b2f8a81418819de8b78d33994)
Liste et spécification de toutes les notifications de la plateforme.
**💡 Business Model — Réflexions** : [Ouvrir](https://www.notion.so/3271d95b2f8a814b9f32f7165eda3a1b)
Modèle économique, pricing SaaS, types de workspace.
**🎛️ Arbitrage — Modèle de saisie des items** : [Ouvrir](https://www.notion.so/3141d95b2f8a81179e82ddd60a07dc27)
Arbitrage critères par catégorie vs par item.
**📝 Synthèse retours prototype** : [Ouvrir](https://www.notion.so/3261d95b2f8a810c91e2e413f0c8b6c4)
Retours client (Flat Checker) sur le premier prototype.

---


# 9. EPICs Webapp (Lot 1) — Vue d'ensemble
Les EPICs suivantes composent la webapp. Chaque lien contient le périmètre fonctionnel détaillé, les décisions prises, et les dépendances.
| # | EPIC | Priorité | Lien |
| 11 | Multi-workspace, Auth, Comptes & Paramètres | P0 | [Ouvrir](https://www.notion.so/3131d95b2f8a812cab8bed6b2d98c4fa) |
| 1 | Gestion des Bâtiments & Lots | P0 | [Ouvrir](https://www.notion.so/3131d95b2f8a81f3a317c6756c9ae867) |
| 2 | Gestion des Tiers | P0 | [Ouvrir](https://www.notion.so/3131d95b2f8a81648e3ee9fee9e70624) |
| 4 | Gestion des Templates (EDL & Inventaires) | P0 | [Ouvrir](https://www.notion.so/3131d95b2f8a81c3b92ac62e50395681) |
| 13 | Missions & Planification | P0 | [Ouvrir](https://www.notion.so/3131d95b2f8a8131b48be85641cc8c31) |
| 14 | Dashboard Admin (Back-office) | P0 | [Ouvrir](https://www.notion.so/3271d95b2f8a816e9e35ec34bc151a59) |
| 16 | Composants Transverses | P0 | [Ouvrir](https://www.notion.so/3271d95b2f8a8198928cf11fa16a89de) |
| 10 | API de Gestion des EDL (Back-office) | P0 | [Ouvrir](https://www.notion.so/3131d95b2f8a8132940fee9684b08080) |

---


# 10. User Stories Webapp — Liste Complète (58 US)
Chaque US dans le Notion contient : description "En tant que...", critères d'acceptation Gherkin, modèle de données impacté, règles métier. **Donner les US complètes à Claude Code pour chaque sprint.**
> **⚠️ EPIC 4 — Templates & Catalogue (US 832, 833, 834, 835) : REPORTÉES EN PHASE MOBILE.**
> Côté webapp, on crée et planifie des missions — les types de pièces et le catalogue d'items ne servent qu'au moment de réaliser l'EDL sur tablette. Ces 4 US seront développées juste avant ou en parallèle de l'app mobile, ce qui permet aussi de les affiner avec les retours du maquettage tablette.
> La page Paramètres (US-810) est livrée au Sprint 2 avec les sections "Informations workspace" et "Utilisateurs & Rôles" uniquement. Les sous-sections Templates/Catalogue/Critères seront ajoutées lors de la phase mobile.
> 
> **⚠️ EPIC 9 — Rapports (US 820, 831) : REPORTÉES EN PHASE MOBILE.**
> La page web publique et le QR code de vérification n'ont de valeur qu'une fois qu'un EDL a été complété et signé depuis la tablette.

## EPIC 11 — Auth & Workspace (8 US)
| US | Titre | Lien |
| 577 | Créer un workspace avec type de profil | [Ouvrir](https://www.notion.so/3131d95b2f8a81a7b0f3e3558e44a603) |
| 578 | Créer un compte et s'authentifier par JWT | [Ouvrir](https://www.notion.so/3131d95b2f8a81c48534dd208f9a2c2d) |
| 579 | Définir et gérer les rôles via WorkspaceUser | [Ouvrir](https://www.notion.so/3131d95b2f8a81d2ba8ad1710b4b4a0f) |
| 580 | Inviter un utilisateur dans un workspace | [Ouvrir](https://www.notion.so/3131d95b2f8a8137bb3fd33d86fd27a6) |
| 581 | Garantir l'isolation complète des données entre workspaces | [Ouvrir](https://www.notion.so/3131d95b2f8a817f93a1c77d53bf7e21) |
| 582 | Archivage froid des données (rétention 10+ ans) | [Ouvrir](https://www.notion.so/3131d95b2f8a81d88baae3ac1558e639) |
| 810 | Page Paramètres du workspace | [Ouvrir](https://www.notion.so/3271d95b2f8a815c9b9be7934413f9ef) |
| 836 | Onboarding d'un nouveau workspace | [Ouvrir](https://www.notion.so/3271d95b2f8a813d8a4cd55606d17d85) |

## EPIC 1 — Bâtiments & Lots (8 US)
| US | Titre | Lien |
| 583 | Créer un bâtiment avec ses informations de base | [Ouvrir](https://www.notion.so/3131d95b2f8a819c9980d19f54040bb7) |
| 584 | Créer un lot rattaché à un bâtiment | [Ouvrir](https://www.notion.so/3131d95b2f8a81e2ab85eff84eb43c2c) |
| 585 | Créer une maison = 1 bâtiment + 1 lot en un clic | [Ouvrir](https://www.notion.so/3131d95b2f8a818e84daf1f56abcdbd4) |
| 586 | Lister, filtrer et rechercher dans le parc immobilier | [Ouvrir](https://www.notion.so/3131d95b2f8a81a8b178f5b5f59a570b) |
| 609 | Consulter la fiche détail d'un lot | [Ouvrir](https://www.notion.so/3131d95b2f8a8196a7e0efb1c107a623) |
| 610 | Consulter la fiche détail d'un bâtiment | [Ouvrir](https://www.notion.so/3131d95b2f8a810bb22cd77008e63c9a) |
| 824 | Archiver un bâtiment ou un lot | [Ouvrir](https://www.notion.so/3271d95b2f8a8138af24e7b22bc0a4a1) |
| 843 | Import en masse de bâtiments et lots via CSV | [Ouvrir](https://www.notion.so/3281d95b2f8a81de9276fb86d753fe8b) |

## EPIC 2 — Tiers (10 US)
| US | Titre | Lien |
| 588 | Créer un tiers (personne physique ou morale) | [Ouvrir](https://www.notion.so/3131d95b2f8a81f69dbbc73f64547ebd) |
| 589 | Associer une PP à une PM via TiersOrganisation | [Ouvrir](https://www.notion.so/3131d95b2f8a81a5adb1c98b216d60b6) |
| 590 | Lier un ou plusieurs propriétaires à un lot (indivision) | [Ouvrir](https://www.notion.so/3131d95b2f8a8147a839e2f001f8920a) |
| 591 | Lier un mandataire de gestion à un lot | [Ouvrir](https://www.notion.so/3131d95b2f8a81c18265e4dcc4094beb) |
| 592 | Retrouver un tiers par nom, type ou rôle | [Ouvrir](https://www.notion.so/3131d95b2f8a81daaa5dcb97824de207) |
| 593 | Mettre à jour ou archiver un tiers | [Ouvrir](https://www.notion.so/3131d95b2f8a818cba3fc94c9767c22d) |
| 806 | Consulter la fiche détail d'un propriétaire | [Ouvrir](https://www.notion.so/3271d95b2f8a81228227ea55dd998f42) |
| 807 | Consulter la fiche détail d'un locataire | [Ouvrir](https://www.notion.so/3271d95b2f8a810a95d7c6f604926f0d) |
| 808 | Naviguer par onglets type de tiers avec colonnes dynamiques | [Ouvrir](https://www.notion.so/3271d95b2f8a8182bde1fcdcfba5aff9) |
| 809 | Consulter la fiche détail d'un mandataire | [Ouvrir](https://www.notion.so/3271d95b2f8a8198bcc5f715bb023475) |

## EPIC 4 — Templates & Catalogue (4 US) — ⚠️ REPORTÉES PHASE MOBILE
Ces US ne font PAS partie des sprints webapp. Elles seront développées en phase mobile.
| US | Titre | Lien |
| 832 | Gérer les types de pièces (CRUD TypePiece) | [Ouvrir](https://www.notion.so/3271d95b2f8a811c8990f83d81219dfe) |
| 833 | Configurer les items par type de pièce | [Ouvrir](https://www.notion.so/3271d95b2f8a815187dff7eac418165f) |
| 834 | Paramétrer les critères d'exigence par catégorie | [Ouvrir](https://www.notion.so/3271d95b2f8a814db9a1d7e8fedfd6ae) |
| 835 | Gérer le catalogue d'items (CatalogueItem) | [Ouvrir](https://www.notion.so/3271d95b2f8a817ea4e4e4c9fc311a11) |

## EPIC 13 — Missions & Planification (11 US webapp)
| US | Titre | Lien |
| 594 | Créer une mission d'intervention sur un lot | [Ouvrir](https://www.notion.so/3131d95b2f8a819fb3dbc62635733740) |
| 595 | Assigner un ou plusieurs techniciens à une mission | [Ouvrir](https://www.notion.so/3131d95b2f8a81f3a6dadac0429a77f9) |
| 597 | Consulter le planning des missions avec filtres | [Ouvrir](https://www.notion.so/3131d95b2f8a817fba22f11c8bf1d7e3) |
| 811 | Consulter la page détail d'une mission | [Ouvrir](https://www.notion.so/3271d95b2f8a818d9885e00e5b5da241) |
| 812 | Vue Kanban des missions | [Ouvrir](https://www.notion.so/3271d95b2f8a81e798d6f6f6bcb85516) |
| 813 | Vue carte / map des missions | [Ouvrir](https://www.notion.so/3271d95b2f8a81b19531e27b41241ed3) |
| 814 | Stat cards révisées de la page Missions | [Ouvrir](https://www.notion.so/3271d95b2f8a8137bb3acd3de4b85862) |
| 822 | Gestion des clés par EDL (CleMission) | [Ouvrir](https://www.notion.so/3271d95b2f8a810cb29cf28899dba1de) |
| 823 | Gérer les indisponibilités technicien | [Ouvrir](https://www.notion.so/3271d95b2f8a812bb154e6592687d050) |
| 825 | Annuler une mission | [Ouvrir](https://www.notion.so/3271d95b2f8a81b1a89bcc72394b0423) |
| 827 | Warning conflit de planning technicien | [Ouvrir](https://www.notion.so/3271d95b2f8a81958b4bd794fff76dbd) |

## EPIC 14 — Dashboard Admin (6 US)
| US | Titre | Lien |
| 837 | Stat cards Dashboard Admin | [Ouvrir](https://www.notion.so/3281d95b2f8a812eafb4d868bd54baa2) |
| 838 | Calendrier semaine Dashboard Admin | [Ouvrir](https://www.notion.so/3281d95b2f8a81df908bfb9e488e79ab) |
| 839 | Mini-calendrier mensuel Dashboard Admin | [Ouvrir](https://www.notion.so/3281d95b2f8a818e85e1dcdb1512ec04) |
| 840 | Bouton "+" Mission & Indisponibilité | [Ouvrir](https://www.notion.so/3281d95b2f8a8128b901de4706359017) |
| 841 | Bloc Actions en attente | [Ouvrir](https://www.notion.so/3281d95b2f8a818cac05c2548f4bf392) |
| 842 | Drawer latéral mission Dashboard Admin | [Ouvrir](https://www.notion.so/3281d95b2f8a812dbc42ec3a3592ae96) |

## EPIC 10 — API Back-office (5 US)
| US | Titre | Lien |
| 599 | Générer et gérer des clés API par workspace | [Ouvrir](https://www.notion.so/3131d95b2f8a81b89178f139d29338fc) |
| 600 | Créer un EDL / Mission via API REST | [Ouvrir](https://www.notion.so/3131d95b2f8a81489e27f328c415050a) |
| 601 | Récupérer les URLs PDF et web d'un EDL signé via API | [Ouvrir](https://www.notion.so/3131d95b2f8a813d92a5db44a85ed889) |
| 602 | Recevoir des webhooks lors d'événements EDL | [Ouvrir](https://www.notion.so/3131d95b2f8a81d2aff2ccc937f3a05a) |
| 603 | Documentation API interactive (OpenAPI / Swagger) | [Ouvrir](https://www.notion.so/3131d95b2f8a811daf7bc9b6f943d91a) |

## EPIC 16 — Composants Transverses (6 US)
| US | Titre | Lien |
| 817 | Colonnes configurables sur tous les tableaux | [Ouvrir](https://www.notion.so/3271d95b2f8a8185a64bc91517517ea8) |
| 818 | Filtres dynamiques type Notion | [Ouvrir](https://www.notion.so/3271d95b2f8a8172b557db7102f28c23) |
| 821 | Notifications plateforme (email + in-app) | [Ouvrir](https://www.notion.so/3271d95b2f8a819f8230d8709d29290b) |
| 828 | Recherche globale cross-entité (Ctrl+K) | [Ouvrir](https://www.notion.so/3271d95b2f8a81828a6ef425ed4487ee) |
| 829 | Autocomplete adresse (Google Places) | [Ouvrir](https://www.notion.so/3271d95b2f8a81d79c63f4ca9959a2f0) |
| 830 | Exporter les tableaux en CSV | [Ouvrir](https://www.notion.so/3271d95b2f8a81feaa70d540c60628a5) |

---


# 11. Sprints Webapp (5 sprints — 58 US)
> **⚠️ RÈGLE DB** : Au Sprint 1, créer la **totalité du schéma de données (28 tables)** y compris les tables qui ne seront consommées par l'UI que dans les sprints suivants ou en phase mobile (ex : `CatalogueItem`, `TypePiece`, `PieceEDL`, `EvaluationItem`, `Photo`, etc.). Les FK et relations croisées entre couches l'exigent, et les seeds plateforme (~155 items, ~30 pièces, ~500 valeurs référentiel, critères par défaut) en dépendent. Une migration initiale propre vaut mieux que des ALTER TABLE au fil des sprints.

## Sprint 1 — Fondations + Parc immobilier
EPIC 11 (partiel) + EPIC 1 + EPIC 16 (socle)
US : 577, 578, 579, 580, 581, 583, 584, 585, 586, 609, 610, 824, 829, 817
Travaux transverses :
- Setup projet (repo, CI/CD, BDD, stack)
- **Création des 28 tables + FK + index + RLS** (schéma complet)
- **Seed données plateforme** (~30 types de pièces, ~155 items catalogue, ~500 valeurs référentiel, ConfigCritereCategorie par défaut)
- Layout principal (sidebar, routing, header)
- Skeleton screens, toasts, responsive base

## Sprint 2 — Tiers + Paramètres (sans Templates)
EPIC 2 + EPIC 11 (fin)
US : 588, 589, 590, 591, 592, 593, 808, 806, 807, 809, 810, 836
Note : La page Paramètres (US-810) est livrée avec les sections "Informations workspace" et "Utilisateurs & Rôles" uniquement. Les sous-sections Templates/Catalogue/Critères (EPIC 4) seront ajoutées en phase mobile.

## Sprint 3 — Missions & Planification
EPIC 13
US : 594, 595, 597, 811, 812, 813, 814, 822, 823, 825, 827

## Sprint 4 — Dashboard Admin + API
EPIC 14 + EPIC 10
US : 837, 838, 839, 840, 841, 842, 599, 600, 601, 602, 603

## Sprint 5 — Composants transverses, Import, QA
EPIC 16 (fin) + US restantes
US : 818, 828, 821, 830, 843, 582
- Breadcrumb, vue carte bâtiments, polish responsive, QA globale

## Phase Mobile (après les 5 sprints webapp)
US reportées :
- **EPIC 4** : US-832, 833, 834, 835 (Templates, Catalogue, Critères — interfaces Paramètres)
- **EPIC 9** : US-820, 831 (QR code vérification, page web publique EDL)
- **EPIC 5** : Saisie EDL/Inventaires sur tablette (ensemble des US à créer)
- **EPIC 8** : Signature & Verrouillage Légal (US à créer)
- **EPIC 12** : Saisie Vocale & IA (P1)

---


# 12. Données de Seed Plateforme
Au Sprint 1, la BDD doit être seedée avec les données de référence Flat Checker :
**~30 types de pièces** : [DB Pièces](https://www.notion.so/dac98de78a5247f58af658d2d2479570)
**~155 items catalogue** (avec sous-items, catégories, contexte EDL/Inventaire) : [DB Items EDL & Inventaire](https://www.notion.so/5a6d90f0b7ea410695e6f5094176bdc0)
**~500+ valeurs référentiel** (caractéristiques, dégradations, couleurs par item) : Définies dans la [Spécification Items](https://www.notion.so/3251d95b2f8a81d9b0befe4d40f7fb68)
**ConfigCritereCategorie par défaut** : 17 catégories × 8 critères avec niveaux d'exigence prédéfinis

---


# 13. Chaîne de Dépendances
```javascript
=== WEBAPP (Lot 1) ===
EPIC 11 (Auth/Workspace) — bloque TOUT
  ↓
EPIC 1 (Bâtiments & Lots)
  ↓
EPIC 2 (Tiers — liés aux lots)
  ↓
EPIC 13 (Missions — dépend lots + tiers)
  ↓
EPIC 14 (Dashboard — dépend missions)
  ↓
EPIC 10 (API — dépend de tout le métier)

EPIC 16 (Composants Transverses) — déployés progressivement

=== PHASE MOBILE (Lot 2) ===
EPIC 4 (Templates & Catalogue — prérequis tablette, pas webapp)
  ↓
EPIC 5 (Saisie EDL/Inventaires Tablette)
  ↓
EPIC 8 (Signature) + EPIC 9 (Rapports PDF/Web)
  ↓
EPIC 12 (Saisie Vocale & IA — P1)
```
> **Note** : Les tables DB de l'EPIC 4 (TypePiece, CatalogueItem, ValeurReferentiel, ConfigCritereCategorie, etc.) sont créées et seedées dès le Sprint 1 webapp. Seules les **interfaces UI** de gestion (pages Paramètres > Templates/Catalogue/Critères) sont reportées en phase mobile.

---


# 14. Ressources Complémentaires
**📚 Hub de Ressources complet** : [Ouvrir](https://www.notion.so/3271d95b2f8a81e8a80dd5e865d69854)
**📄 Document de cadrage amont** : [Ouvrir](https://www.notion.so/3101d95b2f8a809db5e3f43f86d81075)
**📄 Cadrage Fonctionnel** : [Ouvrir](https://www.notion.so/2b61d95b2f8a80b0a0caddd02e9b47a4)
**📄 Kick off & Atelier n°1** : [Ouvrir](https://www.notion.so/3101d95b2f8a806f9397f09b4d801898)