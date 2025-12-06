# Quick Start - BUSTED!

Schnellstart für Entwicklung in unter 5 Minuten.

## 1. Setup (einmalig)

```bash
cd /Users/katrinhoerschelmann/development/exkatibur/Kassiopeia/Apps/Busted/app

# Dependencies installieren
npm install

# iOS Pods (nur macOS)
npx pod-install
```

## 2. Starten

```bash
npm start
```

Dann **w** drücken für Web (schnellster Start)!

## 3. Testen

### Flow durchspielen:

1. **Home**: Username eingeben (z.B. "TestUser")
2. **Create**: Raum erstellen → Code wird angezeigt (ABC123)
3. **Lobby**: Spielerliste sehen (4 Dummy-Spieler)
4. **Vibe wählen**: Party/Date Night/Family auswählen
5. **Start**: "Spiel starten" klicken
6. **Game**: Frage lesen + Spieler wählen + Abstimmen
7. **Results**: BUSTED! Animation + Ergebnisse sehen
8. **Next**: "Nächste Runde" oder "Spiel beenden"

## Das war's!

Alle Screens funktionieren mit Dummy-Daten.
Keine Backend-Verbindung nötig.

## Nächste Phase

**Phase 3: PREP** - Supabase Integration vorbereiten

Siehe `README.md` für vollständige Dokumentation.
