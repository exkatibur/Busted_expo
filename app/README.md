# BUSTED! - Frontend App

Das ultimative Echtzeit-Party-Spiel für 2-30 Spieler.

## Tech Stack

- **Expo** (React Native + Web)
- **TypeScript**
- **NativeWind** (TailwindCSS)
- **Expo Router** (File-based Navigation)
- **React Native Reanimated** (Animationen)

## Installation

```bash
# Dependencies installieren
npm install

# iOS Pods installieren (nur für iOS)
cd ios && pod install && cd ..
```

## Development

```bash
# Metro Bundler starten
npm start

# Spezifische Plattform
npm run ios
npm run android
npm run web
```

## Projektstruktur

```
app/
├── app/                    # Screens (Expo Router)
│   ├── index.tsx           # Home (Username + Actions)
│   ├── create.tsx          # Raum erstellen
│   ├── join.tsx            # Raum beitreten
│   └── room/[code]/        # Dynamische Room-Routes
│       ├── index.tsx       # Lobby
│       ├── game.tsx        # Spiel
│       └── results.tsx     # BUSTED! Reveal
├── components/
│   └── ui/                 # Wiederverwendbare UI Components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── PlayerCard.tsx
│       └── VibeSelector.tsx
├── constants/
│   ├── colors.ts           # Design System
│   └── dummyData.ts        # Dummy-Daten für Frontend
├── types/
│   └── index.ts            # TypeScript Types
└── global.css              # TailwindCSS Globals
```

## Design System (Feuer-Theme)

```typescript
Primary:     #FF6B35 (Orange)
Secondary:   #F72C25 (Rot)
Background:  #0D0D0D (Fast Schwarz)
Surface:     #1A1A2E (Dunkelblau)
Text:        #FFFFFF
Text Muted:  #9CA3AF
Success:     #10B981
Warning:     #F59E0B
```

## Aktueller Status

**Phase 2: FRONTEND** - Komplett mit Dummy-Daten

### Fertig
- ✅ Expo-Projekt Setup mit TypeScript + NativeWind
- ✅ Design System (Colors, Components)
- ✅ Home Screen (Username eingeben)
- ✅ Create Screen (Raum-Code generieren + kopieren)
- ✅ Join Screen (Code eingeben)
- ✅ Lobby Screen (Spielerliste + Vibe-Auswahl)
- ✅ Game Screen (Frage + Abstimmung)
- ✅ Results Screen (BUSTED! Reveal mit Animationen)

### Dummy-Daten
Alle Screens verwenden aktuell Dummy-Daten:
- Spielerliste: 4 feste Spieler
- Fragen: Vordefinierte Fragen pro Vibe
- Abstimmungen: Simulierte Vote-Counts
- Ergebnisse: Statische Resultate mit Prozenten

### Nächste Schritte (Phase 3: PREP)
- ☐ Supabase Schema finalisieren
- ☐ Realtime Channel Setup
- ☐ Auth (Anonyme User IDs)
- ☐ Edge Functions für Room-Logic

## Testing

```bash
# Metro Bundler mit Clear Cache
npm start -- --clear

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## Bekannte Einschränkungen (MVP)

- Keine Persistenz (alle Daten gehen bei Reload verloren)
- Keine echte Realtime-Kommunikation
- Keine Session Recovery
- Keine Host-Transfer-Logic
- Premium Vibes sind gesperrt (UI-only)

## Assets (Placeholder)

Aktuell werden Emojis als Placeholders verwendet:
- 🔥 für App-Icon / Branding
- 👑 für Winner
- 🎉 für Party-Vibe
- etc.

Für Production werden echte Assets benötigt:
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/adaptive-icon.png` (Android)
- `assets/favicon.png` (Web)

## Vibe Coding Regeln

- ✅ Mobile-first Design
- ✅ Große, touch-freundliche Buttons (min 56px)
- ✅ Dunkles Theme
- ✅ Loading/Error/Empty States
- ✅ Keine Datei > 300 Zeilen
- ✅ Dummy-Daten für alles

## Lizenz

Teil des Exkatibur-Ökosystems - "Ein Herz für das Universum"
