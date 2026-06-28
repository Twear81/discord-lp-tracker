# AGENTS.md — discord-lp-tracker

## Vue d'ensemble

Bot Discord qui suit l'historique de parties **League of Legends** et **Teamfight Tactics** pour plusieurs joueurs sur plusieurs serveurs Discord. Il envoie un message à chaque fin de partie, un récap quotidien chaque matin, et un récap mensuel automatique. Supporte SoloQ, Flex, Clash, Ranked 5v5, TFT et TFT Double.

## Tech Stack

- **Node.js** 22 (voir `.devcontainer/devcontainer.json`)
- **TypeScript** strict (`tsconfig.json`: `strict`, `strictNullChecks`, `target: ES2022`, `module: commonjs`)
- **discord.js** v14
- **SQLite** via **Sequelize** v6
- **`@fightmegg/riot-api`** — fork local (`git+https://github.com/Twear81/riot-api.git`)
- **node-cron** — tâches planifiées
- **winston** + **winston-daily-rotate-file** — logs rotatifs
- **bottleneck** — rate-limit des appels Riot API
- **axios** + **dotenv**
- Build: **tsup** (minify). Dev: **tsx watch**. Lint: **ESLint** flat config + typescript-eslint

## Setup & Environment

### Install

```bash
npm install
```

### Variables d'environnement

Fichier `.env` à la racine (cf. `.gitignore`):

```env
DISCORD_TOKEN=...
DISCORD_CLIENTID=...
RIOT_API=...
RIOT_API_TFT=...
```

### Scripts npm

| Script          | Commande                          | Usage                              |
|-----------------|-----------------------------------|------------------------------------|
| `npm run dev`   | `tsx watch src/index.ts`          | Dev avec hot-reload                |
| `npm run build` | `tsup src/index.ts --minify`      | Build production → `dist/`         |
| `npm start`     | `node dist/index.js`              | Run du build                       |

## Repo Layout

```
src/
├── index.ts              # Entry point: client Discord + déclaration de tous les crons
├── deploy-commands.ts    # Déploiement global des slash commands via REST
├── commands/             # Slash commands (un fichier par commande + index.ts qui les agrège)
│   ├── init.ts           # /init — setup serveur (channel, toggles, langue)
│   ├── addPlayer.ts      # /addplayer
│   ├── deletePlayer.ts   # /deleteplayer
│   ├── list.ts           # /list
│   ├── leaderboard.ts    # /leaderboard
│   ├── monthlyRecap.ts   # /monthlyrecap
│   ├── flexToggle.ts     # /flextoggle
│   ├── tftToggle.ts      # /tfttoggle
│   ├── language.ts       # /language
│   ├── help.ts           # /help
│   └── index.ts          # Agrégat exporté sous le nom `commands`
├── database/
│   ├── database.ts       # Instance Sequelize (SQLite, fichier database.sqlite)
│   ├── playerModel.ts    # Player + 6 tables de queue (SoloQ/FlexQ/ClashQ/Ranked5v5/SoloTFT/DoubleTFT)
│   ├── serverModel.ts    # Server (serverid, channelid, flextoggle, tfttoggle, tftdoubletoggle, lang)
│   ├── gameModel.ts      # LeagueGame + TFTGame (snapshots détaillés par partie)
│   ├── databaseHelper.ts # Toutes les queries (CRUD players/servers, getAllServer, listAllPlayerForSpecificServer, etc.)
│   └── init_database.ts  # sequelize.sync + backfill des tables de queue
├── riot/
│   ├── config.ts         # 2× RiotAPI (LoL & TFT) + Bottleneck limiter + cache local TTL
│   ├── leagueApi.ts      # Wrappers LoL (summoner, league, matchv5)
│   ├── tftApi.ts         # Wrappers TFT
│   ├── matchStats.ts     # Extraction des stats d'une partie
│   ├── score.ts          # Calcul du "score" d'une game
│   ├── tactician.ts      # Mapping des tacticiens TFT (via tft-tactician.json)
│   ├── customMessages.ts # Templates d'embeds custom
│   ├── types.ts          # Types partagés Riot
│   ├── region.ts         # Helpers de mapping de région
│   └── index.ts          # Barrel export
├── tracking/
│   ├── tracking.ts       # Orchestration: trackPlayers(), initLastDayInfo(), generateRecapOfTheDay()
│   ├── gameProcessors.ts # leagueGameProcessor + tftGameProcessor + processGameType
│   ├── sendMessage.ts    # Génération et envoi des embeds (match + recap)
│   ├── monthlyRecap.ts   # Logique du récap mensuel
│   ├── purge.ts          # purgeOldGames (cleanup > 24 mois)
│   ├── util.ts           # isTimestampInRecapRange et autres helpers
│   └── GameQueueType.ts  # enum GameQueueType (RANKED_SOLO_5x5, RANKED_FLEX_SR, RANKED_CLASH, RANKED_5v5, RANKED_TFT, RANKED_TFT_DOUBLE_UP) + ManagedGameQueueType
├── translation/
│   └── translation.ts    # getTranslations(lang) → GameTranslations (FR + EN)
├── logger/
│   └── logger.ts         # Instance winston (Console + DailyRotateFile)
├── error/
│   └── error.ts          # AppError + ErrorTypes
└── ...
```

Fichiers à la racine: `tft-tactician.json` (cache local des tacticiens TFT, MAJ quotidienne via DDragon), `database.sqlite` (gitignoré), `logs/YYYY-MM-DD.log` (gitignoré via pattern logs).

## Database

- **SQLite** via Sequelize, fichier `database.sqlite` à la racine (gitignoré).
- Schéma principal:
  - `Server` — un enregistrement par serveur Discord (`serverid` unique, `channelid` unique, toggles, langue).
  - `Player` — un enregistrement par joueur tracké (`puuid`, `tftpuuid`, `serverid`, `gameName`, `tagLine`, `region`, `lastGameID`, `lastTFTGameID`).
  - Tables de queue (`SoloQ`, `FlexQ`, `ClashQ`, `Ranked5v5`, `SoloTFT`, `DoubleTFT`) — `hasOne` depuis Player, stockent `currentRank/Tier/LP`, `oldRank/Tier/LP`, et `lastDay*` pour le récap quotidien.
  - `LeagueGame` / `TFTGame` — `hasMany` depuis Player, snapshot détaillé par partie (KDA, CS, score, queueType, lpGain, rank/tier/lp before/after, etc.).
- Relations en **`CASCADE`** sur la `playerId`: supprimer un Player supprime toutes ses games et entrées de queue.
- **Init**: `initDB()` fait `sequelize.sync({ force: false })` puis `backfillQueueTables()` pour créer les entrées de queue manquantes pour les joueurs existants (utile après ajout d'un nouveau type de queue).
- **`Player.lastGameID` / `lastTFTGameID`** servent de pointeur "dernière partie connue" pour ne pas retraiter les anciennes games à chaque cycle.

## Riot API

Deux clients distincts dans `src/riot/config.ts`:

- `riotApi` (clé `RIOT_API`) — LoL: `summoner`, `account`, `league`, `matchv5`.
- `riotApiTFT` (clé `RIOT_API_TFT`) — TFT: `tft-summoner-v1`, `tft-match-v1`, `tft-league-v1`, `account`.

**Cache local** activé avec TTL par méthode (en ms):
- `GET_BY_PUUID` (summoner / account): 60 000
- `GET_ENTRIES_BY_PUUID` (league): 30 000
- `GET_MATCH_BY_ID`: 30 000
- `GET_IDS_BY_PUUID` (matchlist): 5 000

**Rate-limit** via `Bottleneck` (`limitedRequest()` wrapper):
- `minTime: 50ms` (max 20 req/s)
- `reservoir: 100` requêtes
- refresh toutes les **120 000ms** (2 min)

Tous les appels Riot doivent passer par `limitedRequest(() => api.method(...))`.

**`tft-tactician.json`** — cache local des tacticiens TFT, MAJ quotidienne depuis DDragon (`https://ddragon.leagueoflegends.com/cdn/<version>/data/en_US/tft-tactician.json`), gardé dans `src/index.ts` via `TACTICIAN_FILE_PATH`.

## Tracking & Cron Jobs

Tous déclarés dans `src/index.ts` au `Events.ClientReady`:

| Cron          | Action                                              |
|---------------|-----------------------------------------------------|
| `*/5 * * * *` | `trackPlayers(false)` — vérif des nouvelles games  |
| `33 6 * * *`  | `generateRecapOfTheDay()` + `initLastDayInfo(true)` — récap quotidien du matin + reset des compteurs |
| `0 10 * * *`  | `updateTFTTacticianFile()` — MAJ DDragon            |
| `0 8 1 * *`   | `generateMonthlyRecap()` — récap mensuel du mois précédent |
| `0 0 1 * *`   | `purgeOldGames(2)` — supprime les games > 24 mois   |

Au démarrage (pre-run):
1. `deployCommands()` — enregistre les slash commands globalement
2. `initDB()` — sync + backfill
3. `initLastDayInfo(false)` — initialise les compteurs "lastDay" sans reset
4. `trackPlayers(true)` — premier passage, avec flag `firstRun`

`GuildDelete` → `deleteAllPlayersOfServer(serverId)` + `deleteServer(serverId)` (cleanup automatique quand le bot quitte un serveur).

## Commands

| Commande        | Description                                                          | Fichier              |
|-----------------|----------------------------------------------------------------------|----------------------|
| `/init`         | Setup serveur: channel + toggles Flex/TFT + langue                   | `commands/init.ts`   |
| `/addplayer`    | Ajoute un joueur au suivi (`accountname`, `tag`, `region`)           | `commands/addPlayer.ts` |
| `/deleteplayer` | Supprime un joueur                                                   | `commands/deletePlayer.ts` |
| `/list`         | Liste les joueurs suivis du serveur                                  | `commands/list.ts`   |
| `/leaderboard`  | Classement général des joueurs                                       | `commands/leaderboard.ts` |
| `/monthlyrecap` | Génère manuellement un récap mensuel (`month`, `year`)               | `commands/monthlyRecap.ts` |
| `/flextoggle`   | Toggle tracking Flex pour le serveur                                 | `commands/flexToggle.ts` |
| `/tfttoggle`    | Toggle tracking TFT pour le serveur                                  | `commands/tftToggle.ts` |
| `/language`     | Change la langue du serveur (FR/EN)                                  | `commands/language.ts` |
| `/help`         | Affiche le guide d'utilisation (embed dans la langue du serveur)     | `commands/help.ts`   |

Toutes les commandes sont déployées **globalement** (`Routes.applicationCommands`), pas par-guild.

## i18n

- Source unique dans `src/translation/translation.ts`.
- `getTranslations(lang: string): GameTranslations` — retourne FR ou EN, fallback EN si langue inconnue.
- `GameTranslations` couvre: titres d'embeds, labels de stats, queues, placements TFT, winrate, etc.
- Pour ajouter une langue: ajouter une entrée dans `allTranslations` avec la même structure que `fr` / `en`, et typer la clé dans les `addChoices` du `language.ts` (et de `init.ts` si pertinent).
- La langue est stockée par serveur dans `Server.lang`.

## Logging

- `src/logger/logger.ts` exporte l'instance par défaut (`import logger from '.../logger'`).
- Console: colorisé, format `[timestamp] [level]: message`.
- Fichier: `logs/%DATE%.log` (rotation quotidienne), pattern `YYYY-MM-DD`, conservés **2 jours**, taille max **20MB** par fichier, format JSON avec stack trace pour les erreurs.
- Niveau par défaut: `info` en prod, `debug` sinon (`process.env.NODE_ENV`).
- **Toujours** logger via cette instance — pas de `console.log` dans le code applicatif.

## Conventions & Patterns

- **Une commande = un fichier** exportant `data` (`SlashCommandBuilder`) et `execute(interaction)`, puis agrégé dans `commands/index.ts` sous la map `commands`.
- **Erreurs typées** via `AppError` + `ErrorTypes` (`src/error/error.ts`). On attrape généralement dans la couche appelante et on log via `logger.error(...)`.
- **Réponses éphémères** (`MessageFlags.Ephemeral`) sur les erreurs d'interaction et l'embed `/help`.
- **Channel de sortie** = `Server.channelid` du serveur — c'est là que partent les embeds de fin de partie, récap quotidien et récap mensuel.
- **GuildDelete** → nettoyage complet (players + server). Pas besoin de gérer manuellement.
- **Toggles par serveur**: `Server.flextoggle` contrôle le tracking Flex, `Server.tfttoggle` contrôle TFT et TFT Double. SoloQ, Clash et Ranked 5v5 toujours actifs.
- **Pas de `console.log`** dans le code applicatif — toujours `logger.info/warn/error`.
- **ESLint flat config** présent (`eslint.config.mjs`) avec `typescript-eslint` recommended — mais **pas de script `lint`** dans `package.json`. Pas de test runner non plus.

## Verification

Aucune commande de test ni de lint dédiée n'est configurée dans `package.json`. La seule commande de vérif couvrant l'ensemble est:

```bash
npm run build
```

Cette commande passe par `tsup` qui compile le projet avec **TypeScript strict mode** (`tsconfig.json`); toute erreur de type y sera remontée. À lancer après toute modification pour valider la compilation.

Pour vérifier le runtime manuellement: `npm run dev` (hot-reload) ou `npm start` après `npm run build`.

## Gotchas

- **SoloQ, Clash et Ranked 5v5 toujours actifs** au récap quotidien, indépendamment du jour de la semaine ou des toggles serveur. Flex est contrôlé par `Server.flextoggle`, TFT et TFT Double par `Server.tfttoggle`. `Server.tftdoubletoggle` existe en DB mais n'est pas exposé via `/init` (commenté dans `commands/init.ts`).
- **TFT Double** partage le toggle TFT (`server.tfttoggle`), pas un toggle séparé.
- **Déploiement global des commands** (`Routes.applicationCommands` dans `deploy-commands.ts`) — la propagation aux serveurs peut prendre jusqu'à 1h après changement de définition.
- **Logs quotidiens** dans `logs/` — bien que non listés explicitement dans `.gitignore`, ils ne sont **pas** versionnés (`*.log` et `logs/` y figurent).
- **Fichier `database.sqlite`** créé au runtime à la racine — gitignoré, ne pas le commit.
- **Credentials DB** dans `database.ts` — factices (SQLite local, pas d'auth réelle), mais à ignorer/retirer si jamais on migre vers un vrai SGBD.