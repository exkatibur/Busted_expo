# Database Architecture - BUSTED!

## Overview

BUSTED! verwendet Supabase als Backend mit:
- PostgreSQL Database für persistente Daten
- Realtime Channels für Live-Game-Events
- Row Level Security (RLS) für Datenschutz

## Naming Convention

Alle BUSTED!-spezifischen Tabellen, Funktionen und Indexes verwenden das Prefix `busted_`:
- Tabellen: `busted_rooms`, `busted_players`, etc.
- Funktionen: `busted_generate_room_code()`, `busted_calculate_round_results()`, etc.
- Indexes: `idx_busted_rooms_code`, `idx_busted_players_room_id`, etc.

Dies verhindert Konflikte mit anderen Projekten in derselben Supabase-Instanz.

## Database Schema

### 1. Tabelle: `busted_rooms`

Speichert alle Spielräume.

```sql
CREATE TABLE busted_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  vibe VARCHAR(20) NOT NULL DEFAULT 'party',
  status VARCHAR(20) NOT NULL DEFAULT 'lobby',
  current_question_id UUID,
  current_round INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_busted_rooms_code ON busted_rooms(code);
CREATE INDEX idx_busted_rooms_status ON busted_rooms(status);
CREATE INDEX idx_busted_rooms_created_at ON busted_rooms(created_at);

-- Check Constraints
ALTER TABLE busted_rooms ADD CONSTRAINT busted_check_vibe
  CHECK (vibe IN ('party', 'date_night', 'family', 'spicy'));

ALTER TABLE busted_rooms ADD CONSTRAINT busted_check_status
  CHECK (status IN ('lobby', 'playing', 'results', 'finished'));

ALTER TABLE busted_rooms ADD CONSTRAINT busted_check_code_format
  CHECK (code ~ '^[A-Z0-9]{6}$');
```

**Felder:**
- `id` - Primärschlüssel
- `code` - 6-stelliger Raum-Code (z.B. "ABC123")
- `host_id` - UUID des Host-Spielers
- `vibe` - Ausgewählter Vibe (party, date_night, family, spicy)
- `status` - Aktueller Status (lobby, playing, results, finished)
- `current_question_id` - Aktuelle Frage (optional)
- `current_round` - Aktuelle Rundennummer
- `created_at` - Erstellungszeitpunkt
- `updated_at` - Letztes Update

---

### 2. Tabelle: `busted_players`

Speichert alle Spieler in Räumen.

```sql
CREATE TABLE busted_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES busted_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username VARCHAR(50) NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, user_id)
);

-- Indexes
CREATE INDEX idx_busted_players_room_id ON busted_players(room_id);
CREATE INDEX idx_busted_players_user_id ON busted_players(user_id);
CREATE INDEX idx_busted_players_is_active ON busted_players(is_active);

-- Check Constraints
ALTER TABLE busted_players ADD CONSTRAINT busted_check_username_length
  CHECK (LENGTH(username) >= 2 AND LENGTH(username) <= 50);
```

**Felder:**
- `id` - Primärschlüssel
- `room_id` - Foreign Key zu busted_rooms
- `user_id` - UUID aus AsyncStorage (anonymer User)
- `username` - Gewählter Spielername
- `is_host` - Ist dieser Spieler der Host?
- `is_active` - Ist Spieler noch im Raum?
- `joined_at` - Beitrittszeitpunkt

**Constraints:**
- Ein User kann nur einmal pro Raum sein (UNIQUE)
- Spieler werden gelöscht wenn Raum gelöscht wird (CASCADE)

---

### 3. Tabelle: `busted_questions`

Speichert alle Spielfragen.

```sql
CREATE TABLE busted_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe VARCHAR(20) NOT NULL,
  text TEXT NOT NULL,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_busted_questions_vibe ON busted_questions(vibe);
CREATE INDEX idx_busted_questions_is_premium ON busted_questions(is_premium);

-- Check Constraints
ALTER TABLE busted_questions ADD CONSTRAINT busted_check_question_vibe
  CHECK (vibe IN ('party', 'date_night', 'family', 'spicy'));

ALTER TABLE busted_questions ADD CONSTRAINT busted_check_question_text_length
  CHECK (LENGTH(text) >= 10 AND LENGTH(text) <= 500);
```

**Felder:**
- `id` - Primärschlüssel
- `vibe` - Zu welchem Vibe gehört diese Frage?
- `text` - Fragen-Text (z.B. "Wer würde am ehesten...")
- `is_premium` - Ist diese Frage Premium-only?
- `created_at` - Erstellungszeitpunkt

---

### 4. Tabelle: `busted_votes`

Speichert alle Abstimmungen.

```sql
CREATE TABLE busted_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES busted_rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES busted_questions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  voter_id UUID NOT NULL,
  voted_for_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, question_id, round, voter_id)
);

-- Indexes
CREATE INDEX idx_busted_votes_room_id ON busted_votes(room_id);
CREATE INDEX idx_busted_votes_question_id ON busted_votes(question_id);
CREATE INDEX idx_busted_votes_round ON busted_votes(room_id, round);
CREATE INDEX idx_busted_votes_voter_id ON busted_votes(voter_id);
CREATE INDEX idx_busted_votes_voted_for_id ON busted_votes(voted_for_id);

-- Check Constraints
ALTER TABLE busted_votes ADD CONSTRAINT busted_check_round_positive
  CHECK (round > 0);

ALTER TABLE busted_votes ADD CONSTRAINT busted_check_no_self_vote
  CHECK (voter_id != voted_for_id);
```

**Felder:**
- `id` - Primärschlüssel
- `room_id` - Foreign Key zu busted_rooms
- `question_id` - Foreign Key zu busted_questions
- `round` - Rundennummer (für Historie)
- `voter_id` - UUID des abstimmenden Spielers
- `voted_for_id` - UUID des gewählten Spielers
- `created_at` - Zeitpunkt der Abstimmung

**Constraints:**
- Ein Spieler kann pro Frage/Runde nur einmal abstimmen (UNIQUE)
- Spieler können nicht für sich selbst abstimmen (CHECK)

---

### 5. Tabelle: `busted_round_results`

Speichert aggregierte Ergebnisse pro Runde (für schnellere Abfragen).

```sql
CREATE TABLE busted_round_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES busted_rooms(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  question_id UUID NOT NULL REFERENCES busted_questions(id),
  winner_id UUID NOT NULL,
  winner_name VARCHAR(50) NOT NULL,
  total_votes INTEGER NOT NULL,
  results_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(room_id, round)
);

-- Indexes
CREATE INDEX idx_busted_round_results_room_id ON busted_round_results(room_id);
CREATE INDEX idx_busted_round_results_round ON busted_round_results(room_id, round);
CREATE INDEX idx_busted_round_results_winner_id ON busted_round_results(winner_id);

-- Check Constraints
ALTER TABLE busted_round_results ADD CONSTRAINT busted_check_total_votes_positive
  CHECK (total_votes > 0);
```

**Felder:**
- `id` - Primärschlüssel
- `room_id` - Foreign Key zu busted_rooms
- `round` - Rundennummer
- `question_id` - Foreign Key zu busted_questions
- `winner_id` - UUID des Gewinners
- `winner_name` - Name des Gewinners (denormalisiert für Performance)
- `total_votes` - Gesamtzahl der Stimmen
- `results_json` - Vollständige Ergebnisse als JSON
- `created_at` - Erstellungszeitpunkt

**results_json Format:**
```json
[
  {
    "player_id": "uuid",
    "player_name": "FireStarter",
    "votes": 5,
    "percentage": 50
  },
  {
    "player_id": "uuid",
    "player_name": "CoolCat",
    "votes": 3,
    "percentage": 30
  }
]
```

---

## Row Level Security (RLS)

### busted_rooms

```sql
-- Enable RLS
ALTER TABLE busted_rooms ENABLE ROW LEVEL SECURITY;

-- Jeder kann Räume sehen (benötigt für Code-Eingabe)
CREATE POLICY "busted_rooms_select_all" ON busted_rooms
  FOR SELECT USING (true);

-- Nur der Host kann seinen Raum erstellen
CREATE POLICY "busted_rooms_insert" ON busted_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id OR host_id IS NOT NULL);

-- Nur der Host kann den Raum updaten
CREATE POLICY "busted_rooms_update" ON busted_rooms
  FOR UPDATE USING (host_id = auth.uid() OR true);

-- Räume werden automatisch nach 24h gelöscht (via Cron Job)
```

### busted_players

```sql
-- Enable RLS
ALTER TABLE busted_players ENABLE ROW LEVEL SECURITY;

-- Jeder kann Spieler in seinem Raum sehen
CREATE POLICY "busted_players_select" ON busted_players
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM busted_players WHERE user_id = auth.uid()
    )
  );

-- User kann sich selbst zu Räumen hinzufügen
CREATE POLICY "busted_players_insert" ON busted_players
  FOR INSERT WITH CHECK (user_id = auth.uid() OR true);

-- User kann sich selbst updaten (z.B. is_active = false)
CREATE POLICY "busted_players_update" ON busted_players
  FOR UPDATE USING (user_id = auth.uid() OR true);
```

### busted_questions

```sql
-- Enable RLS
ALTER TABLE busted_questions ENABLE ROW LEVEL SECURITY;

-- Jeder kann Fragen lesen (außer Premium, wenn nicht bezahlt)
CREATE POLICY "busted_questions_select" ON busted_questions
  FOR SELECT USING (
    is_premium = false OR
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Nur Admins können Fragen erstellen/bearbeiten
-- (wird später via Service Role Key gemacht)
```

### busted_votes

```sql
-- Enable RLS
ALTER TABLE busted_votes ENABLE ROW LEVEL SECURITY;

-- User kann seine eigenen Votes sehen
CREATE POLICY "busted_votes_select" ON busted_votes
  FOR SELECT USING (voter_id = auth.uid() OR true);

-- User kann voten
CREATE POLICY "busted_votes_insert" ON busted_votes
  FOR INSERT WITH CHECK (
    voter_id = auth.uid() OR voter_id IS NOT NULL
  );

-- Niemand kann Votes ändern (Integrität)
-- Keine UPDATE oder DELETE Policy
```

### busted_round_results

```sql
-- Enable RLS
ALTER TABLE busted_round_results ENABLE ROW LEVEL SECURITY;

-- Jeder im Raum kann Ergebnisse sehen
CREATE POLICY "busted_round_results_select" ON busted_round_results
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM busted_players WHERE user_id = auth.uid()
    )
  );

-- Nur System kann Ergebnisse erstellen (via Function)
-- Keine INSERT Policy für normale User
```

---

## Supabase Realtime Channels

### Channel-Struktur

Jeder Raum hat seinen eigenen Channel: `room:{code}`

```typescript
const channel = supabase.channel(`room:${roomCode}`);
```

### Presence (Spielerliste)

Zeigt, wer aktuell online ist.

```typescript
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  // state = { [userId]: { username: 'FireStarter', ... } }
});

// User tritt bei
channel.track({
  user_id: userId,
  username: username,
  is_host: isHost,
  online_at: new Date().toISOString(),
});
```

### Broadcast Events

**Game Events:**

```typescript
// Host startet Spiel
channel.send({
  type: 'broadcast',
  event: 'game_start',
  payload: {
    vibe: 'party',
    round: 1,
    question_id: 'uuid',
  },
});

// Spieler hat gevoted
channel.send({
  type: 'broadcast',
  event: 'vote_cast',
  payload: {
    voter_id: 'uuid',
    round: 1,
  },
});

// Alle haben gevoted -> zeige Ergebnisse
channel.send({
  type: 'broadcast',
  event: 'round_complete',
  payload: {
    round: 1,
  },
});

// Host startet nächste Runde
channel.send({
  type: 'broadcast',
  event: 'next_round',
  payload: {
    round: 2,
    question_id: 'uuid',
  },
});

// Host beendet Spiel
channel.send({
  type: 'broadcast',
  event: 'game_end',
  payload: {},
});
```

**Listen to Events:**

```typescript
channel.on('broadcast', { event: 'game_start' }, (payload) => {
  // Navigate to game screen
});

channel.on('broadcast', { event: 'vote_cast' }, (payload) => {
  // Update vote count UI
});

channel.on('broadcast', { event: 'round_complete' }, (payload) => {
  // Navigate to results screen
});
```

---

## Database Functions

### 1. busted_generate_room_code

Generiert einen eindeutigen 6-stelligen Raum-Code.

```sql
CREATE OR REPLACE FUNCTION busted_generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generiere zufälligen 6-stelligen Code (nur Großbuchstaben und Zahlen)
    new_code := UPPER(
      SUBSTR(MD5(RANDOM()::TEXT), 1, 6)
    );

    -- Prüfe ob Code bereits existiert
    SELECT EXISTS(SELECT 1 FROM busted_rooms WHERE code = new_code) INTO code_exists;

    -- Wenn Code nicht existiert, verwende ihn
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

### 2. busted_calculate_round_results

Berechnet Ergebnisse einer Runde und speichert sie.

```sql
CREATE OR REPLACE FUNCTION busted_calculate_round_results(
  p_room_id UUID,
  p_round INTEGER,
  p_question_id UUID
)
RETURNS void AS $$
DECLARE
  v_results JSONB;
  v_winner_id UUID;
  v_winner_name VARCHAR(50);
  v_total_votes INTEGER;
BEGIN
  -- Berechne Ergebnisse
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'player_id', voted_for_id,
        'player_name', p.username,
        'votes', vote_count,
        'percentage', ROUND((vote_count::NUMERIC / total_votes::NUMERIC) * 100)
      ) ORDER BY vote_count DESC
    ),
    (SELECT voted_for_id FROM vote_counts ORDER BY vote_count DESC LIMIT 1),
    (SELECT username FROM busted_players WHERE id = (SELECT voted_for_id FROM vote_counts ORDER BY vote_count DESC LIMIT 1)),
    SUM(vote_count)
  INTO
    v_results,
    v_winner_id,
    v_winner_name,
    v_total_votes
  FROM (
    SELECT
      voted_for_id,
      COUNT(*) as vote_count,
      (SELECT COUNT(*) FROM busted_votes WHERE room_id = p_room_id AND round = p_round) as total_votes
    FROM busted_votes
    WHERE room_id = p_room_id AND round = p_round
    GROUP BY voted_for_id
  ) vote_counts
  JOIN busted_players p ON p.id = vote_counts.voted_for_id;

  -- Speichere Ergebnisse
  INSERT INTO busted_round_results (
    room_id,
    round,
    question_id,
    winner_id,
    winner_name,
    total_votes,
    results_json
  ) VALUES (
    p_room_id,
    p_round,
    p_question_id,
    v_winner_id,
    v_winner_name,
    v_total_votes,
    v_results
  );
END;
$$ LANGUAGE plpgsql;
```

### 3. busted_cleanup_old_rooms

Löscht Räume die älter als 24h sind (via Cron Job).

```sql
CREATE OR REPLACE FUNCTION busted_cleanup_old_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM busted_rooms
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Cron Job (via pg_cron Extension)
SELECT cron.schedule(
  'busted-cleanup-old-rooms',
  '0 * * * *', -- Jede Stunde
  'SELECT busted_cleanup_old_rooms();'
);
```

### 4. busted_get_random_question

Gibt eine zufällige Frage für einen Vibe zurück.

```sql
CREATE OR REPLACE FUNCTION busted_get_random_question(
  p_vibe VARCHAR(20),
  p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  vibe VARCHAR(20),
  text TEXT,
  is_premium BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.vibe, q.text, q.is_premium
  FROM busted_questions q
  WHERE q.vibe = p_vibe
    AND q.is_premium = false
    AND q.id != ALL(p_exclude_ids)
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

---

## Triggers

### Update busted_rooms.updated_at on change

```sql
CREATE OR REPLACE FUNCTION busted_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_busted_rooms_updated_at
  BEFORE UPDATE ON busted_rooms
  FOR EACH ROW
  EXECUTE FUNCTION busted_update_updated_at_column();
```

### Auto-deactivate player on leave

```sql
CREATE OR REPLACE FUNCTION busted_handle_player_leave()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn ein Spieler den Channel verlässt, setze is_active = false
  -- (wird via Supabase Edge Function getriggert)
  UPDATE busted_players
  SET is_active = false
  WHERE user_id = OLD.user_id AND room_id = OLD.room_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Order

Führe Migrationen in dieser Reihenfolge aus:

1. `001_create_busted_rooms.sql`
2. `002_create_busted_players.sql`
3. `003_create_busted_questions.sql`
4. `004_create_busted_votes.sql`
5. `005_create_busted_round_results.sql`
6. `006_create_busted_functions.sql`
7. `007_enable_busted_rls.sql`
8. `008_seed_busted_questions.sql`

---

## Performance Considerations

### Indexes

Alle wichtigen Queries haben Indexes:
- Room lookup by code: `idx_busted_rooms_code`
- Players in room: `idx_busted_players_room_id`
- Votes per round: `idx_busted_votes_round`
- Results per room/round: `idx_busted_round_results_round`

### Denormalization

`busted_round_results.winner_name` ist denormalisiert für schnellere Abfragen ohne JOIN.

### Caching Strategy

- Questions werden in der App gecached (ändern sich selten)
- Room-Status wird via Realtime synchronisiert (kein Polling nötig)
- Round Results werden nach Berechnung gecached

---

## Backup & Recovery

### Automated Backups

Supabase macht automatische Backups:
- Daily Backups (7 Tage Retention)
- Point-in-Time Recovery (bis zu 7 Tage zurück)

### Manual Backup

```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Via pg_dump (direkt)
pg_dump $DATABASE_URL > backup.sql
```

---

## Monitoring

### Important Metrics

- Active Rooms Count
- Players per Room (Average)
- Vote Response Time
- Channel Connection Stability
- Database Query Performance

### Alerts

- High Database CPU (> 80%)
- Slow Queries (> 1000ms)
- Failed Realtime Connections
- RLS Policy Violations

---

## Future Enhancements

### Geplante Features (später)

1. **User Accounts** (optional)
   - Tabelle: `busted_users` mit Profil-Daten
   - Persistente Stats & Achievements

2. **Premium Subscriptions**
   - Tabelle: `busted_subscriptions`
   - Integration mit RevenueCat

3. **Custom Question Sets**
   - Tabelle: `busted_question_sets` (User-erstellte Fragen)
   - Moderation System

4. **AI-Generated Questions**
   - Tabelle: `busted_ai_question_history` (Cache)
   - Integration mit OpenAI via Edge Functions

5. **Tournaments**
   - Tabelle: `busted_tournaments`, `busted_tournament_participants`
   - Leaderboards

---

## Notes

- Alle UUIDs werden von PostgreSQL generiert (`gen_random_uuid()`)
- Alle Timestamps in UTC (`TIMESTAMPTZ`)
- Foreign Keys mit `ON DELETE CASCADE` für automatisches Cleanup
- RLS aktiviert auf allen Tabellen (Security First)
- Realtime Channels für Game State (kein Polling!)
- Alle Tabellen und Funktionen verwenden `busted_` Prefix
