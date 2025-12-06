# Installation & Setup - BUSTED!

## Voraussetzungen

- **Node.js** >= 18.x
- **npm** oder **yarn**
- **Xcode** (für iOS Development) - nur macOS
- **Android Studio** (für Android Development)

## 1. Dependencies installieren

```bash
cd /Users/katrinhoerschelmann/development/exkatibur/Kassiopeia/Apps/Busted/app

# NPM verwenden
npm install

# Oder Yarn
yarn install
```

## 2. iOS Setup (nur macOS)

```bash
# iOS Pods installieren
npx pod-install
```

## 3. Development starten

### Option A: Interaktiv (Expo Go App)

```bash
npm start
```

Dann:
- **i** drücken für iOS Simulator
- **a** drücken für Android Emulator
- **w** drücken für Web Browser
- QR-Code scannen mit Expo Go App (iOS/Android)

### Option B: Direkt starten

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## 4. Troubleshooting

### Metro Bundler Cache leeren

```bash
npm start -- --clear
```

### iOS Simulator öffnet nicht

```bash
# Xcode öffnen und Simulator manuell starten
open -a Simulator
```

### Android Emulator fehlt

1. Android Studio öffnen
2. Tools → Device Manager
3. Create Virtual Device
4. Pixel 6 (oder ähnlich) auswählen
5. System Image downloaden (API 33+)

### TypeScript Errors

```bash
# TypeScript Cache leeren
rm -rf node_modules/.cache
npm start -- --clear
```

### NativeWind funktioniert nicht

```bash
# Metro Config neu laden
npm start -- --reset-cache
```

## 5. Erste Schritte

1. **Username eingeben**: Beim ersten Start Name wählen (min. 3 Zeichen)
2. **Raum erstellen**: "Raum erstellen" klicken → Code wird generiert
3. **Code teilen**: Code kopieren und an Freunde senden (Dummy: ABC123)
4. **Zur Lobby**: Spieler warten in der Lobby
5. **Vibe wählen**: Host wählt Party/Date Night/Family/Spicy
6. **Spiel starten**: Host klickt "Spiel starten" (min. 2 Spieler)
7. **Abstimmen**: Jeder wählt einen Spieler für die Frage
8. **BUSTED!**: Ergebnisse werden mit Animation gezeigt

## 6. Dummy-Daten

Die App verwendet aktuell statische Dummy-Daten:

- **Spieler**: 4 vordefinierte Spieler (FireStarter, CoolCat, PartyKing, NightOwl)
- **Raum-Code**: Immer "ABC123"
- **Fragen**: Vordefinierte Listen pro Vibe
- **Ergebnisse**: Statische Votes

In Phase 3 (PREP) werden diese durch echte Daten aus Supabase ersetzt.

## 7. Development Workflow

```bash
# 1. Code ändern (VSCode, Cursor, etc.)
# 2. Metro Bundler lädt automatisch neu
# 3. App aktualisiert sich im Simulator/Emulator
# 4. Bei TypeScript-Fehlern: npm start -- --clear
```

## 8. Bekannte Probleme

- **Session geht verloren**: Bei Reload werden alle Daten gelöscht (kein Backend)
- **Mehrere Spieler simulieren**: Aktuell nur möglich mit mehreren Devices/Simulatoren
- **Premium Vibes gesperrt**: UI zeigt Lock-Icon, keine Kauflogic implementiert

## 9. Nächste Steps

Nach erfolgreichem Frontend-Testing:

1. **Phase 3: PREP** - Supabase Schema finalisieren
2. **Phase 4: AUTH** - Anonyme User IDs implementieren
3. **Phase 5: DATABASE** - Realtime Channels + RLS Policies
4. **Phase 6: PAYMENTS** - RevenueCat/Stripe Integration
5. **Phase 7: DEPLOY** - App Stores + Web Deployment

## Support

Bei Problemen:
1. `npm start -- --clear` versuchen
2. `node_modules` löschen und `npm install` neu ausführen
3. Issue im Projekt-Repository erstellen
