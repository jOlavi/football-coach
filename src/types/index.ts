export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type SkillLevel = 1 | 2 | 3;
export type MatchLevel = 'friendly' | 'league' | 'cup' | 'tournament';
export type TeamLevel = 'taso1' | 'taso2';
export type MatchLocation = 'home' | 'away';
export type ExerciseCategory = 'warmup' | 'technical' | 'tactical' | 'physical' | 'game';
export type TeamFormat = '5v5' | '7v7' | '8v8' | '11v11';
export type MessageType = 'match_reminder' | 'tournament_info' | 'training_change' | 'custom';
export type AvailabilityStatus = 'available' | 'unavailable' | 'unknown';

export interface Player {
  id: string;
  name: string;
  number: number;
  position: Position;
  skillLevel: SkillLevel;
  dateOfBirth: string;
  parentName: string;
  parentContact: string;
  active: boolean;
  createdAt: string;
}

export interface GoalScorer {
  playerId: string;
  count: number;
}

export interface MatchResult {
  goalsFor: number;
  goalsAgainst: number;
  scorers: GoalScorer[];
}

export interface PlayerAvailability {
  playerId: string;
  status: AvailabilityStatus;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  level: MatchLevel;
  location: MatchLocation;
  venue: string;
  address?: string;
  format?: TeamFormat;
  teamLevel?: TeamLevel;
  lineup: string[];
  availability: PlayerAvailability[];
  lineupConfirmed?: boolean;
  result?: MatchResult;
  ownTeamId?: string;
  notes: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  duration: number;
  description: string;
  goals?: string;
  tags?: string[];
  playerCount?: number;
  canvasDataUrl?: string;
  drillId?: string;
}

export interface GroupSet {
  id: string;
  label: string;
  playerIds: string[][];
  groupNames: string[];
  playerColors?: Record<string, string>;
}

export interface TrainingSession {
  id: string;
  date: string;
  startTime?: string;
  title: string;
  duration: number;
  exercises: Exercise[];
  notes: string;
  groupSets?: GroupSet[];
  uncertainPlayerIds?: string[];
  createdAt: string;
}

export interface GeneratedTeam {
  name: string;
  players: string[];
  formation: string;
}

export interface TeamGeneration {
  id: string;
  format: TeamFormat;
  teams: GeneratedTeam[];
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  type: MessageType;
  title: string;
  content: string;
}

export type FieldType =
  | 'football'
  | 'floorball'
  | 'basketball'
  | 'icehockey'
  | 'half'
  | '5v5'
  | 'penalty'
  | 'blank';

export type SizeKey = 'small' | 'normal' | 'large';

export type ToolType =
  | 'select' | 'player' | 'opponent' | 'cone' | 'ball' | 'goal'
  | 'arrow' | 'dashed' | 'curved' | 'zone' | 'text';

export type Shape =
  | { type: 'player';   id: string; x: number; y: number; color: string; size: SizeKey; number: number }
  | { type: 'opponent'; id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'cone';     id: string; x: number; y: number; color: string; size: SizeKey }
  | { type: 'ball';     id: string; x: number; y: number; size: SizeKey }
  | { type: 'goal';     id: string; x: number; y: number; color: string; size: SizeKey; rotation: number }
  | { type: 'arrow';    id: string; points: [number, number][]; dashed: boolean; curved: boolean; color: string; size: SizeKey }
  | { type: 'zone';     id: string; x: number; y: number; w: number; h: number; color: string }
  | { type: 'text';     id: string; x: number; y: number; text: string; color: string; size: SizeKey };

export interface OwnTeam {
  id: string;
  name: string;
  createdAt: string;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  goals: string;
  duration: number;
  repetitions: number;
  fieldType: FieldType;
  canvasDataUrl: string;
  shapes: Shape[];
  tags?: string[];
  imageUrl?: string;
  createdAt: string;
}

export interface OwnTeam {
  id: string;
  name: string;
  createdAt: string;
}

export interface FirebaseTeam {
  id: string;
  name: string;
  sport: string;
  season: string;
  headCoachId: string;
  coaches: string[];
}

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}
