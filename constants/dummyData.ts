import type { VibeOption } from '@/types';

export const DUMMY_PLAYERS = [
  { id: '1', username: 'FireStarter', isHost: true, joinedAt: new Date().toISOString() },
  { id: '2', username: 'CoolCat', isHost: false, joinedAt: new Date().toISOString() },
  { id: '3', username: 'PartyKing', isHost: false, joinedAt: new Date().toISOString() },
  { id: '4', username: 'NightOwl', isHost: false, joinedAt: new Date().toISOString() },
];

export const DUMMY_QUESTIONS = {
  party: [
    'Wer würde am ehesten auf einer Party einschlafen?',
    'Wer würde am ehesten die Karaoke-Maschine monopolisieren?',
    'Wer würde am ehesten auf dem Tisch tanzen?',
    'Wer würde am ehesten vergessen, wo sie geparkt haben?',
    'Wer würde am ehesten zu viel Alkohol trinken?',
  ],
  date_night: [
    'Wer würde am ehesten beim ersten Date zu viel reden?',
    'Wer würde am ehesten das Dessert bestellen?',
    'Wer würde am ehesten zu spät zum Date kommen?',
    'Wer würde am ehesten die Rechnung übernehmen?',
  ],
  family: [
    'Wer würde am ehesten das Familienessen organisieren?',
    'Wer würde am ehesten die besten Geschenke kaufen?',
    'Wer würde am ehesten den Familienurlaub planen?',
  ],
  spicy: [
    'Wer würde am ehesten in der Öffentlichkeit erwischt werden?',
    'Wer würde am ehesten eine Affäre haben?',
    'Wer würde am ehesten beim Lügen erwischt werden?',
  ],
};

export const VIBES: VibeOption[] = [
  { id: 'party', name: 'Party', icon: '🎉', color: '#FF6B35' },
  { id: 'date_night', name: 'Date Night', icon: '💕', color: '#F72C25' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦', color: '#10B981' },
  { id: 'spicy', name: 'Spicy', icon: '🌶️', color: '#F59E0B', isPremium: true },
];

export const DUMMY_ROOM_CODE = 'ABC123';

export const DUMMY_RESULTS = [
  { playerId: '1', playerName: 'FireStarter', votes: 5, percentage: 50 },
  { playerId: '2', playerName: 'CoolCat', votes: 3, percentage: 30 },
  { playerId: '3', playerName: 'PartyKing', votes: 2, percentage: 20 },
  { playerId: '4', playerName: 'NightOwl', votes: 0, percentage: 0 },
];
