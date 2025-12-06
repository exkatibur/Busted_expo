# BUSTED! Deployment Guide

## Overview

BUSTED! wird deployed als:
- **Web**: Static Export auf Hetzner VPS mit Caddy
- **iOS**: EAS Build → TestFlight → App Store
- **Android**: EAS Build → Play Console

## Quick Deploy (Web)

```bash
cd Apps/Busted/app

# Build
npx expo export --platform web

# Deploy (wenn Server konfiguriert)
export HETZNER_SERVER_IP=your.server.ip
../deploy/deploy.sh
```

---

## Web Deployment (Hetzner)

### Voraussetzungen

- Hetzner VPS (CX21 oder größer)
- Domain: busted.exkatibur.de
- Caddy installiert auf Server

### 1. DNS Konfiguration

Bei deinem DNS-Provider:
```
A Record: busted.exkatibur.de → SERVER_IP
```

### 2. Server Setup (einmalig)

```bash
# SSH zum Server
ssh root@YOUR_SERVER_IP

# Ordner erstellen
mkdir -p /var/www/busted.exkatibur.de
mkdir -p /var/log/caddy

# Caddy Config kopieren (vom lokalen Rechner)
scp Apps/Busted/deploy/Caddyfile root@SERVER:/etc/caddy/sites/busted.conf

# In /etc/caddy/Caddyfile einfügen:
# import sites/*.conf

# Caddy neu laden
systemctl reload caddy
```

### 3. Deployment

**Option A: Deploy Script**
```bash
cd Apps/Busted
export HETZNER_SERVER_IP=your.server.ip
./deploy/deploy.sh
```

**Option B: Manuell**
```bash
cd Apps/Busted/app

# Build
npx expo export --platform web

# Upload
scp -r dist/* root@SERVER:/var/www/busted.exkatibur.de/
```

**Option C: Docker**
```bash
# Auf Server
cd /opt/busted
git pull  # oder scp der Dateien
docker compose -f docker-compose.web.yml up -d
```

### 4. Verifizieren

```bash
curl -I https://busted.exkatibur.de
# Sollte 200 OK zurückgeben
```

---

## Mobile Deployment (EAS)

### Voraussetzungen

```bash
# EAS CLI installieren
npm install -g eas-cli

# Bei Expo einloggen
eas login
```

### 1. Projekt konfigurieren (einmalig)

```bash
cd Apps/Busted/app

# EAS Projekt initialisieren
eas init

# Credentials konfigurieren
eas credentials
```

### 2. Development Build

```bash
# iOS Simulator
eas build --profile development --platform ios

# Android APK (zum Testen)
eas build --profile preview --platform android
```

### 3. Production Build

```bash
# Beide Plattformen
eas build --profile production --platform all

# Oder einzeln
eas build --profile production --platform ios
eas build --profile production --platform android
```

### 4. App Store Submission

**iOS (TestFlight → App Store)**
```bash
eas submit --platform ios
```

Voraussetzungen:
- Apple Developer Account ($99/Jahr)
- App Store Connect App erstellt
- In eas.json: APPLE_ID, ASC_APP_ID, APPLE_TEAM_ID setzen

**Android (Play Store)**
```bash
eas submit --platform android
```

Voraussetzungen:
- Google Play Developer Account ($25 einmalig)
- Play Console App erstellt
- google-services.json für Service Account

---

## Environment Variables

### Lokal (.env)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### EAS Secrets

```bash
# Secrets für EAS Builds setzen
eas secret:create --name SUPABASE_URL --value "https://xxx.supabase.co"
eas secret:create --name SUPABASE_ANON_KEY --value "eyJ..."
```

---

## CI/CD (Optional)

### GitHub Actions

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'Apps/Busted/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: cd Apps/Busted/app && npm ci

      - name: Build
        run: cd Apps/Busted/app && npx expo export --platform web

      - name: Deploy to Hetzner
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.HETZNER_IP }}
          username: root
          key: ${{ secrets.SSH_KEY }}
          source: "Apps/Busted/app/dist/*"
          target: "/var/www/busted.exkatibur.de"
          strip_components: 4
```

---

## Kosten

| Komponente | Kosten |
|------------|--------|
| Hetzner VPS CX21 | ~€6/Mo |
| Domain (.de) | ~€1/Mo |
| Apple Developer | €99/Jahr |
| Google Play | €25 einmalig |
| **Web MVP** | **~€7/Mo** |
| **+ Mobile** | **~€15/Mo** |

---

## Checkliste vor Go-Live

### Web
- [ ] DNS A-Record gesetzt
- [ ] HTTPS funktioniert (Caddy automatisch)
- [ ] Supabase URL korrekt
- [ ] Alle Screens laden

### Mobile
- [ ] App Icons korrekt
- [ ] Splash Screen korrekt
- [ ] Deep Links funktionieren
- [ ] Push Notifications (falls aktiviert)

### Supabase
- [ ] RLS Policies aktiv
- [ ] Realtime aktiviert für Tabellen
- [ ] Seed-Fragen vorhanden

---

## Troubleshooting

### Web: 404 auf Unterseiten
→ Caddy try_files Regel prüfen

### Mobile: Build fehlgeschlagen
```bash
eas build:inspect
eas diagnostics
```

### Supabase Connection Failed
→ EXPO_PUBLIC_ Prefix für env vars prüfen

---

## Useful Commands

```bash
# Logs auf Server
ssh root@SERVER "tail -f /var/log/caddy/busted.log"

# EAS Build Status
eas build:list

# Lokaler Web Test
cd Apps/Busted/app
npx expo start --web
```
