# BUSTED! - Project Blueprint

> Party-Spiel wo Freunde sich gegenseitig "verraten" durch Abstimmungen.

---

## Stack

| Komponente | Technologie |
|------------|-------------|
| **Frontend** | Expo (React Native + Web) |
| **Sprache** | TypeScript |
| **UI Library** | NativeWind (TailwindCSS für React Native) |
| **State Management** | Zustand + React Query |
| **Navigation** | Expo Router (File-based) |
| **Realtime** | Supabase Realtime (Presence + Broadcast) |
| **Animationen** | React Native Reanimated + Lottie |

---

## Infrastruktur (fest)

| Komponente | Anbieter | Kosten |
|------------|----------|--------|
| Auth & DB | Supabase (Free Tier) | €0 |
| Realtime | Supabase Realtime | €0 (inkludiert) |
| Edge Functions | Supabase Edge Functions | €0 (inkludiert) |
| Payments Web | Stripe | ~3% |
| Payments Mobile | RevenueCat | Free bis $2.5k |

> **Kein eigenes Backend nötig!** Supabase deckt alles ab: DB, Realtime, Auth, Edge Functions.
> Bei Bedarf (Payments Webhooks) können Supabase Edge Functions genutzt werden.

---

## Design System

### Farben (Feuer-Theme)
```
Primary:     #FF6B35 (Orange)
Secondary:   #F72C25 (Rot)
Background:  #0D0D0D (Fast Schwarz)
Surface:     #1A1A2E (Dunkelblau)
Text:        #FFFFFF
Text Muted:  #9CA3AF
Success:     #10B981
Warning:     #F59E0B
```

### Typography
- Headlines: Bold, große Größen
- Body: Regular, gut lesbar
- "Große Buttons, leicht zu treffen nach ein paar Drinks"

---

## Features (MVP)

### Phase 1: Core Game
- [x] Anonymer Start mit Username
- [ ] Raum erstellen (6-stelliger Code)
- [ ] Raum beitreten
- [ ] Lobby mit Echtzeit-Spielerliste
- [ ] Vibe auswählen (Party, Date Night, Family, Spicy)
- [ ] Frage anzeigen
- [ ] Abstimmung (andere Spieler wählen)
- [ ] Warte-Phase mit Live-Counter
- [ ] BUSTED! Reveal mit Konfetti + Podium
- [ ] Nächste Runde / Spiel beenden

### Phase 2: Polish
- [ ] Session Recovery (App neu öffnen → zurück ins Spiel)
- [ ] Host-Transfer wenn Host geht
- [ ] Sound-Effekte
- [ ] Haptic Feedback

### Phase 3: Monetization (später)
- [ ] Premium Vibes (kaufen)
- [ ] Werbefreiheit

### Phase 4: Content (später)
- [ ] AI-generierte Fragen (OpenAI) - User gibt Thema ein, AI generiert passende Fragen
- [ ] User-erstellte Fragen - Eigene Fragen schreiben und mit Freunden teilen

> Siehe `docs/features.md` für vollständige Feature Road Map

---

## Screens

```
/                       → Home (Username eingeben wenn neu)
/create                 → Raum erstellen
/join                   → Raum beitreten (Code eingeben)
/room/[code]            → Lobby
/room/[code]/game       → Aktives Spiel (Frage + Abstimmung)
/room/[code]/results    → BUSTED! Ergebnis-Screen
```

---

## Realtime Architecture

### Supabase Channels pro Raum
```typescript
// Channel pro Raum-Code
const channel = supabase.channel(`room:${roomCode}`)

// 1. Presence: Wer ist online?
channel.on('presence', { event: 'sync' }, () => {
  const players = channel.presenceState()
})

// 2. Broadcast: Events an alle
channel.on('broadcast', { event: 'vote' }, ({ payload }) => {
  // Jemand hat abgestimmt
})

channel.on('broadcast', { event: 'game_start' }, ({ payload }) => {
  // Host hat Spiel gestartet
})

channel.on('broadcast', { event: 'reveal' }, ({ payload }) => {
  // Ergebnisse werden gezeigt
})
```

### Events
| Event | Trigger | Payload |
|-------|---------|---------|
| `player_join` | Spieler betritt Raum | `{ username, isHost }` |
| `player_leave` | Spieler verlässt | `{ username }` |
| `game_start` | Host startet | `{ vibe, questionCount }` |
| `question` | Neue Frage | `{ questionId, text }` |
| `vote` | Jemand stimmt ab | `{ voterId }` (nicht wen!) |
| `reveal` | Alle haben abgestimmt | `{ results: [...] }` |
| `next_round` | Host drückt weiter | `{ roundNumber }` |
| `game_end` | Spiel beendet | `{}` |

---

## Database Schema (Supabase)

### Tabellen

```sql
-- Räume
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL,
  vibe VARCHAR(20) DEFAULT 'party',
  status VARCHAR(20) DEFAULT 'lobby', -- lobby, playing, finished
  current_question_id UUID,
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spieler in Räumen
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Anonymous UUID from device
  username VARCHAR(30) NOT NULL,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Fragen
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe VARCHAR(20) NOT NULL, -- party, date_night, family, spicy
  text_de TEXT NOT NULL,
  text_en TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Abstimmungen
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  round INTEGER NOT NULL,
  voter_id UUID NOT NULL,
  voted_for_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, question_id, round, voter_id)
);

-- Runden-Ergebnisse (für History)
CREATE TABLE round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  question_id UUID REFERENCES questions(id),
  winner_id UUID NOT NULL,
  winner_username VARCHAR(30) NOT NULL,
  vote_count INTEGER NOT NULL,
  results JSONB NOT NULL, -- Alle Ergebnisse
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Ordnerstruktur

```
Apps/Busted/
├── BLUEPRINT.md          # Diese Datei
├── CLAUDE.md             # Projekt-spezifische Anweisungen
├── APP_BESCHREIBUNG.md   # Original Feature-Beschreibung
├── app/                  # Expo App
│   ├── app/              # Expo Router (screens)
│   │   ├── room/
│   │   │   └── [code]/
│   │   │       ├── index.tsx      # Lobby
│   │   │       ├── game.tsx       # Spiel
│   │   │       └── results.tsx    # Ergebnisse
│   │   ├── create.tsx
│   │   ├── join.tsx
│   │   └── index.tsx     # Home
│   ├── components/       # Shared Components
│   │   ├── ui/           # Buttons, Cards, etc.
│   │   ├── game/         # Spiel-spezifische Components
│   │   └── animations/   # Konfetti, etc.
│   ├── hooks/            # Custom Hooks
│   ├── lib/              # Utilities
│   │   ├── supabase.ts
│   │   └── realtime.ts
│   ├── stores/           # Zustand Stores
│   ├── types/            # TypeScript Types
│   └── constants/        # Colors, Config
├── supabase/
│   ├── migrations/       # SQL Migrations
│   ├── functions/        # Edge Functions (für Webhooks etc.)
│   └── seed.sql          # Initiale Fragen
└── docs/
    ├── architecture.md
    └── features.md
```

---

## Entwicklungs-Reihenfolge

```
1. ✅ BLUEPRINT (dieser Schritt)
2. ⏳ FRONTEND - UI mit Dummy-Daten
3. ☐ PREP - Schema finalisieren
4. ☐ AUTH - Anonyme User + optionale Accounts
5. ☐ DATABASE - Supabase Tabellen + RLS + Realtime
6. ☐ PAYMENTS - Premium Vibes (Supabase Edge Functions für Webhooks)
7. ☐ DEPLOY - App Stores + Web
```

> **Vereinfacht!** Kein separates Backend/Storage nötig. Supabase macht alles.

---

## Befehle

```bash
# In Apps/Busted/app/

# Entwicklung starten
npx expo start

# Web
npx expo start --web

# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Build für Production
eas build --platform all
```

---

## Deploy-Strategie

| Plattform | Methode | Ziel |
|-----------|---------|------|
| Web | Expo Web Export (Static) | Hetzner (Caddy) |
| iOS | EAS Build | TestFlight → App Store |
| Android | EAS Build | Play Console → Play Store |
| Backend | Kein eigenes Backend | Supabase (DB, Realtime, Edge Functions) |

### Domain
- Web: **busted.exkatibur.de**
- API: Supabase (kein eigenes Backend)

### Build Commands
```bash
# Web (Static Export für Hetzner)
cd Apps/Busted/app
npx expo export --platform web
# Output in dist/ → auf Hetzner hochladen

# Mobile (EAS Build)
eas build --platform ios
eas build --platform android

# Oder beides zusammen
eas build --platform all
```

### Hetzner Web Deploy
```bash
# Auf Hetzner VPS
# 1. Ordner erstellen
mkdir -p /var/www/busted.exkatibur.de

# 2. Expo Web dist/ hochladen
scp -r dist/* root@SERVER:/var/www/busted.exkatibur.de/

# 3. Caddy Config
# busted.exkatibur.de {
#     root * /var/www/busted.exkatibur.de
#     file_server
#     try_files {path} /index.html
# }
```

---

## Notizen

- **Kein Account nötig**: User bekommt anonyme UUID, Username wird lokal gespeichert
- **Web ist Priority**: Party-Gäste sollen per Link beitreten können
- **Offline nicht nötig**: Spiel funktioniert nur online
- **Fragen sind Seeds**: Initiale Fragen kommen aus der DB, später User-Generated
