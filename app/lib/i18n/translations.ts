/**
 * Translations für BUSTED!
 * Unterstützte Sprachen: Deutsch (de), Englisch (en)
 */

export type Language = 'de' | 'en';

export const translations = {
  de: {
    // General
    app_name: 'BUSTED!',
    loading: 'Lädt...',
    error: 'Fehler',
    save: 'Speichern',
    cancel: 'Abbrechen',
    back: 'Zurück',
    continue: 'Weiter',
    close: 'Schließen',

    // Home Screen
    home: {
      tagline: 'Das ultimative Party-Spiel',
      welcome_back: 'Willkommen zurück, {username}! Bereit zum Spielen?',
      choose_name: 'Wähle deinen Namen',
      name_placeholder: 'z.B. FireStarter',
      name_hint: 'Mindestens 3 Zeichen',
      lets_go: "Los geht's!",
      name_saved_hint: 'Dein Name wird lokal gespeichert und ist für alle Spiele sichtbar',
      create_room: 'Raum erstellen',
      join_room: 'Raum beitreten',
      logged_in_as: 'Eingeloggt als {username} • Profil bearbeiten',
      version: 'Version {version} • Made with 🔥 by Exkatibur',
    },

    // Profile
    profile: {
      title: 'Profil',
      change_name: 'Anzeigename ändern',
      new_name: 'Neuer Name',
      name_requirements: '3-20 Zeichen',
      name_changed: 'Name erfolgreich geändert!',
      your_id: 'Deine ID',
      id_anonymous: 'Diese ID identifiziert dich anonym in Spielen',
      id_linked: 'Verknüpft mit deinem Konto',
      logged_in: 'Eingeloggt',
      sign_out: 'Abmelden',
      create_account: 'Konto erstellen',
      account_hint: 'Speichere deine Daten auf allen Geräten',
      sign_in_register: 'Anmelden / Registrieren',
    },

    // Auth
    auth: {
      sign_in: 'Anmelden',
      sign_up: 'Registrieren',
      email: 'E-Mail',
      password: 'Passwort',
      display_name: 'Anzeigename',
      email_placeholder: 'deine@email.de',
      password_placeholder: 'Mindestens 6 Zeichen',
      name_placeholder: 'z.B. FireStarter',
      sign_in_hint: 'Melde dich an, um auf deine gespeicherten Daten zuzugreifen',
      sign_up_hint: 'Erstelle ein Konto, um deine Daten auf allen Geräten zu synchronisieren',
      already_account: 'Schon ein Konto?',
      no_account: 'Noch kein Konto?',
      why_register: 'Warum registrieren?',
      benefit_1: 'Deinen Namen auf allen Geräten behalten',
      benefit_2: 'Premium-Features freischalten (bald)',
      benefit_3: 'Eigene Fragen speichern (bald)',
      registration_success: 'Registrierung erfolgreich! Bitte bestätige deine E-Mail.',
      invalid_email: 'Bitte gib eine gültige E-Mail-Adresse ein',
      password_too_short: 'Passwort muss mindestens 6 Zeichen haben',
      name_too_short: 'Name muss mindestens 3 Zeichen haben',
    },

    // Room
    room: {
      room_code: 'Raum-Code',
      copy_code: 'Code kopieren',
      code_copied: 'Code kopiert!',
      enter_code: 'Code eingeben',
      code_placeholder: 'z.B. ABC123',
      invalid_code: 'Ungültiger Code',
      room_not_found: 'Raum nicht gefunden',
      join: 'Beitreten',
      players: 'Spieler',
      waiting_for_players: 'Warte auf Spieler...',
      start_game: 'Spiel starten',
      need_more_players: 'Mindestens 2 Spieler benötigt',
      leave_room: 'Raum verlassen',
    },

    // Game
    game: {
      round: 'Runde {round}',
      select_player: 'Wähle einen Spieler',
      skip_question: 'Frage überspringen',
      skipping: 'Wird übersprungen...',
      vote: 'Abstimmen',
      voting: 'Wird gesendet...',
      vote_submitted: 'Stimme abgegeben!',
      waiting_for_others: 'Warte auf die anderen Spieler...',
      votes_count: '{count} / {total} haben abgestimmt',
      voting_progress: 'Abstimmungsfortschritt',
      hint: 'Hinweis',
      anonymous_voting: 'Deine Stimme ist anonym. Niemand sieht, wer für wen gestimmt hat. Am Ende wird nur gezeigt, wer die meisten Stimmen hat.',
      no_more_questions: 'Keine weiteren Fragen verfügbar',
      loading_question: 'Lade Frage...',
      no_question_loaded: 'Keine Frage geladen',
      to_lobby: 'Zur Lobby',
    },

    // Results
    results: {
      busted: 'BUSTED!',
      loading_results: 'Lade Ergebnisse...',
      the_question_was: 'Die Frage war:',
      votes: 'Stimmen',
      all_results: 'Alle Ergebnisse',
      player_busted: '{player} wurde erwischt!',
      group_has_spoken: 'Die Gruppe hat gesprochen 😄',
      next_round: 'Nächste Runde',
      starting: 'Startet...',
      end_game: 'Spiel beenden',
    },

    // Create Room
    create: {
      title: 'Raum erstellen',
      creating: 'Erstelle Raum...',
      room_created: 'Raum erstellt!',
      share_code: 'Teile diesen Code mit deinen Freunden:',
      to_lobby: 'Zur Lobby',
    },

    // Join Room
    join: {
      title: 'Raum beitreten',
      joining: 'Trete bei...',
      enter_code_hint: 'Gib den 6-stelligen Code ein',
    },

    // Vibes
    vibes: {
      party: 'Party',
      date_night: 'Date Night',
      family: 'Familie',
      spicy: 'Spicy',
      select_vibe: 'Wähle einen Vibe',
    },

    // Settings
    settings: {
      title: 'Einstellungen',
      language: 'Sprache',
      german: 'Deutsch',
      english: 'English',
    },

    // Errors
    errors: {
      generic: 'Ein Fehler ist aufgetreten',
      network: 'Netzwerkfehler',
      try_again: 'Bitte versuche es erneut',
    },
  },

  en: {
    // General
    app_name: 'BUSTED!',
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    back: 'Back',
    continue: 'Continue',
    close: 'Close',

    // Home Screen
    home: {
      tagline: 'The ultimate party game',
      welcome_back: 'Welcome back, {username}! Ready to play?',
      choose_name: 'Choose your name',
      name_placeholder: 'e.g. FireStarter',
      name_hint: 'At least 3 characters',
      lets_go: "Let's go!",
      name_saved_hint: 'Your name is saved locally and visible in all games',
      create_room: 'Create Room',
      join_room: 'Join Room',
      logged_in_as: 'Logged in as {username} • Edit profile',
      version: 'Version {version} • Made with 🔥 by Exkatibur',
    },

    // Profile
    profile: {
      title: 'Profile',
      change_name: 'Change display name',
      new_name: 'New name',
      name_requirements: '3-20 characters',
      name_changed: 'Name changed successfully!',
      your_id: 'Your ID',
      id_anonymous: 'This ID identifies you anonymously in games',
      id_linked: 'Linked to your account',
      logged_in: 'Logged in',
      sign_out: 'Sign out',
      create_account: 'Create account',
      account_hint: 'Save your data across all devices',
      sign_in_register: 'Sign in / Register',
    },

    // Auth
    auth: {
      sign_in: 'Sign in',
      sign_up: 'Register',
      email: 'Email',
      password: 'Password',
      display_name: 'Display name',
      email_placeholder: 'your@email.com',
      password_placeholder: 'At least 6 characters',
      name_placeholder: 'e.g. FireStarter',
      sign_in_hint: 'Sign in to access your saved data',
      sign_up_hint: 'Create an account to sync your data across all devices',
      already_account: 'Already have an account?',
      no_account: "Don't have an account?",
      why_register: 'Why register?',
      benefit_1: 'Keep your name across all devices',
      benefit_2: 'Unlock premium features (soon)',
      benefit_3: 'Save your own questions (soon)',
      registration_success: 'Registration successful! Please confirm your email.',
      invalid_email: 'Please enter a valid email address',
      password_too_short: 'Password must be at least 6 characters',
      name_too_short: 'Name must be at least 3 characters',
    },

    // Room
    room: {
      room_code: 'Room Code',
      copy_code: 'Copy code',
      code_copied: 'Code copied!',
      enter_code: 'Enter code',
      code_placeholder: 'e.g. ABC123',
      invalid_code: 'Invalid code',
      room_not_found: 'Room not found',
      join: 'Join',
      players: 'Players',
      waiting_for_players: 'Waiting for players...',
      start_game: 'Start Game',
      need_more_players: 'At least 2 players needed',
      leave_room: 'Leave room',
    },

    // Game
    game: {
      round: 'Round {round}',
      select_player: 'Select a player',
      skip_question: 'Skip question',
      skipping: 'Skipping...',
      vote: 'Vote',
      voting: 'Sending...',
      vote_submitted: 'Vote submitted!',
      waiting_for_others: 'Waiting for other players...',
      votes_count: '{count} / {total} have voted',
      voting_progress: 'Voting progress',
      hint: 'Note',
      anonymous_voting: 'Your vote is anonymous. No one sees who voted for whom. Only the person with the most votes is revealed.',
      no_more_questions: 'No more questions available',
      loading_question: 'Loading question...',
      no_question_loaded: 'No question loaded',
      to_lobby: 'To Lobby',
    },

    // Results
    results: {
      busted: 'BUSTED!',
      loading_results: 'Loading results...',
      the_question_was: 'The question was:',
      votes: 'Votes',
      all_results: 'All Results',
      player_busted: '{player} got busted!',
      group_has_spoken: 'The group has spoken 😄',
      next_round: 'Next Round',
      starting: 'Starting...',
      end_game: 'End Game',
    },

    // Create Room
    create: {
      title: 'Create Room',
      creating: 'Creating room...',
      room_created: 'Room created!',
      share_code: 'Share this code with your friends:',
      to_lobby: 'To Lobby',
    },

    // Join Room
    join: {
      title: 'Join Room',
      joining: 'Joining...',
      enter_code_hint: 'Enter the 6-digit code',
    },

    // Vibes
    vibes: {
      party: 'Party',
      date_night: 'Date Night',
      family: 'Family',
      spicy: 'Spicy',
      select_vibe: 'Select a vibe',
    },

    // Settings
    settings: {
      title: 'Settings',
      language: 'Language',
      german: 'Deutsch',
      english: 'English',
    },

    // Errors
    errors: {
      generic: 'An error occurred',
      network: 'Network error',
      try_again: 'Please try again',
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.de;
