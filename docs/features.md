# Feature Road Map - BUSTED!

## Target: MVP (Phase 1-7)

### Core Game Loop
- **Status**: planned
- **Beschreibung**: Kompletter Spielablauf von Raum erstellen bis BUSTED! Reveal
- **Features**:
  - Anonymer Start mit Username
  - Raum erstellen/beitreten (6-stelliger Code)
  - Lobby mit Echtzeit-Spielerliste
  - Vibe auswählen (Party, Date Night, Family, Spicy)
  - Frage anzeigen + Abstimmung
  - BUSTED! Reveal mit Konfetti + Podium
  - Nächste Runde / Spiel beenden

### Session Recovery
- **Status**: planned
- **Beschreibung**: App neu öffnen → automatisch zurück ins laufende Spiel
- **Dependencies**: Core Game Loop

---

## Target: Post-MVP (1-3 Monate nach Launch)

### Premium Vibes
- **Status**: planned
- **Beschreibung**: Zusätzliche Fragen-Kategorien zum Kaufen
- **Beispiele**: "Drunk Mode", "Couples Only", "Work Edition"
- **Dependencies**: Payments Integration
- **Monetization**: In-App Purchase

### Sound & Haptics
- **Status**: planned
- **Beschreibung**: Sound-Effekte und Haptic Feedback
- **Features**:
  - Abstimmungs-Sound
  - BUSTED! Reveal Sound
  - Konfetti-Vibration

---

## Target: Future (3-6 Monate)

### AI-generierte Fragen
- **Status**: planned (SPÄTER)
- **Beschreibung**: OpenAI generiert personalisierte Fragen basierend auf Kontext
- **Features**:
  - User gibt Thema/Anlass ein (z.B. "JGA für Lisa")
  - AI generiert passende Fragen
  - Optional: Namen der Spieler in Fragen einbauen
- **Dependencies**: OpenAI API Integration, Supabase Edge Functions
- **Monetization**: Premium Feature oder Credits
- **Notizen**:
  - Edge Function ruft OpenAI API auf
  - Fragen werden gecached um API-Kosten zu sparen
  - Content-Filter für unangemessene Inhalte

### User-erstellte Fragen
- **Status**: planned (SPÄTER)
- **Beschreibung**: User können eigene Fragen erstellen und teilen
- **Features**:
  - Eigene Fragen schreiben
  - Private Fragen-Sets für Freundesgruppen
  - Öffentliche Fragen-Sets (mit Moderation)
  - Fragen bewerten/reporten
- **Dependencies**: User Accounts (nicht nur anonym), Moderation System
- **Monetization**: Free für private, Premium für öffentliche Sets
- **Notizen**:
  - Braucht Content-Moderation (automatisch + manuell)
  - Evtl. Community-Voting für beste Fragen

---

## Target: Vision (6+ Monate)

### Tournaments / Leagues
- **Status**: idea
- **Beschreibung**: Regelmäßige Spielrunden mit Punktestand über Zeit
- **Dependencies**: User Accounts, Leaderboards

### Avatare & Customization
- **Status**: idea
- **Beschreibung**: Eigene Avatare erstellen/kaufen
- **Dependencies**: Storage für Bilder, Premium System

### Party Mode (Chromecast/TV)
- **Status**: idea
- **Beschreibung**: Spiel auf TV zeigen, alle stimmen auf Handy ab
- **Dependencies**: Chromecast SDK

---

## Feature Priorität

| Prio | Feature | Grund |
|------|---------|-------|
| 1 | Core Game Loop | Ohne das kein Spiel |
| 2 | Session Recovery | UX kritisch |
| 3 | Premium Vibes | Monetization |
| 4 | Sound & Haptics | Polish |
| 5 | AI-Fragen | Differenzierung |
| 6 | User-Fragen | Community |
