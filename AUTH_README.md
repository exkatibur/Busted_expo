# Auth System - BUSTED!

## Überblick

BUSTED! nutzt ein **anonymes UUID-basiertes Auth-System** ohne traditionelle Login/Signup-Flows.

## Architektur

### 1. User Identifikation
- Jeder User bekommt beim ersten Start eine **UUID** (gespeichert in AsyncStorage)
- User wählt einen **Username** (3-20 Zeichen)
- Keine Email, kein Passwort, kein Signup nötig für MVP

### 2. Komponenten

#### `/lib/supabase.ts`
- Supabase Client Setup
- AsyncStorage für Session-Persistenz
- Auth deaktiviert (wir nutzen anonyme UUIDs)

#### `/stores/userStore.ts`
- Zustand Store für User State
- `userId`: UUID (auto-generiert)
- `username`: Vom User gewählt
- `isInitialized`: Ob Username gesetzt wurde
- Actions: `setUsername()`, `initializeUser()`, `clearUser()`

#### `/hooks/useUser.ts`
- React Hook als Wrapper um den Store
- Auto-Initialize beim App-Start
- Convenience-Funktionen

### 3. Flow

```
App Start
    ↓
useUser Hook auto-initialize
    ↓
Check AsyncStorage
    ↓
UUID vorhanden?
    ├─ JA → Lade UUID + Username
    └─ NEIN → Generiere neue UUID
    ↓
Username vorhanden?
    ├─ JA → Zeige Home Screen mit "Willkommen zurück, [username]!"
    └─ NEIN → Zeige Username-Auswahl Screen
```

## Verwendung

### In einer Komponente

```tsx
import { useUser } from '@/hooks/useUser';

export default function MyScreen() {
  const { username, isInitialized, isLoading, setUsername } = useUser();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isInitialized) {
    return <UsernameInput onSubmit={setUsername} />;
  }

  return <div>Hallo, {username}!</div>;
}
```

### AsyncStorage Keys

```ts
'@busted/user_id'    // UUID
'@busted/username'   // Username
```

## Zukünftige Erweiterungen

### Optional: Account Upgrade
- User kann später Email hinzufügen
- Migriert anonyme UUID zu Supabase Auth
- Behält alle Spiel-Daten

### Optional: Cross-Device Sync
- User mit Email können Daten synchronisieren
- Anonyme User bleiben device-bound

## Sicherheit

- **Keine sensiblen Daten**: Nur Username + UUID
- **Kein Login nötig**: Schneller Einstieg für Party-Spiel
- **Privacy-friendly**: User teilt nur was er will
- **Database Policies**: User kann nur eigene Daten in Räumen schreiben (siehe Phase 5)

## Entwicklung

### User zurücksetzen (für Testing)

```tsx
const { clearUser } = useUser();

// Löscht UUID + Username aus AsyncStorage
await clearUser();
```

### Neue UUID erzwingen

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.removeItem('@busted/user_id');
// App neu starten
```

## Dependencies

- `@supabase/supabase-js` - Supabase Client
- `@react-native-async-storage/async-storage` - Persistente Storage
- `zustand` - State Management
