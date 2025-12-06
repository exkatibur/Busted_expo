# CLAUDE.md - BUSTED!

## Projekt

**BUSTED!** ist ein Echtzeit-Party-Spiel für 2-30 Spieler. Spieler stimmen ab, wer am ehesten bestimmte Dinge tut ("Wer würde am ehesten..."). Am Ende jeder Runde wird enthüllt, wer die meisten Stimmen bekommen hat - BUSTED!

## Tech Stack

- **Frontend**: Expo (React Native + Web) mit TypeScript
- **UI**: NativeWind (TailwindCSS)
- **State**: Zustand + React Query
- **Realtime**: Supabase Realtime (Presence + Broadcast)
- **Auth & DB**: Supabase
- **Payments**: RevenueCat (Mobile) / Stripe (Web)

## Struktur

```
Apps/Busted/
├── app/                  # Expo App
│   ├── app/              # Screens (Expo Router)
│   ├── components/       # UI Components
│   ├── hooks/            # Custom Hooks
│   ├── lib/              # Supabase, Utils
│   ├── stores/           # Zustand Stores
│   └── types/            # TypeScript Types
├── supabase/             # Migrations, Edge Functions & Policies
└── docs/                 # Architektur-Docs
```

> **Kein eigenes Backend!** Supabase (DB, Realtime, Auth, Edge Functions) reicht aus.

## Befehle

```bash
cd Apps/Busted/app

# Entwicklung
npx expo start           # Metro Bundler
npx expo start --web     # Web Version
npx expo start --ios     # iOS Simulator

# Build
eas build --platform all
```

## Aktuelle Phase

**Phase 9: DEPLOY** - App ist LIVE!

## Hosting

| Komponente | Details |
|------------|---------|
| **URL** | https://busted.exkatibur.de |
| **Server** | Hetzner CPX22 (2 vCPU, 4GB RAM) |
| **IP** | 46.224.91.166 |
| **OS** | Ubuntu 24.04 |
| **Webserver** | Caddy (automatisches HTTPS) |
| **Kosten** | ~€7.13/Mo |

### SSH Zugang
```bash
ssh -i ~/.ssh/id_exkatibur root@46.224.91.166
```

### Deployment
```bash
cd Apps/Busted/app
npx expo export --platform web
rsync -avz -e "ssh -i ~/.ssh/id_exkatibur" dist/ root@46.224.91.166:/var/www/busted.exkatibur.de/
```

## Wichtige Patterns

### Realtime Channel pro Raum
```typescript
const channel = supabase.channel(`room:${roomCode}`)
// Presence für Spielerliste
// Broadcast für Game Events
```

### Anonyme User
- User ID = UUID aus AsyncStorage
- Username wird bei erstem Start gewählt
- Kein Login nötig für MVP

### Design
- Dunkles Theme (Fast Schwarz + Dunkelblau)
- Feuer-Farben (Orange #FF6B35, Rot #F72C25)
- Große, touch-freundliche Buttons

## Siehe auch

- `BLUEPRINT.md` - Vollständiger Tech Stack & Schema
- `APP_BESCHREIBUNG.md` - Original Feature-Beschreibung
- `docs/architecture.md` - Datenarchitektur (nach Prep Phase)
