export interface Player {
  id: number;
  name: string;
  team: string;
  flag: string;
  accent: string;
  out: boolean;
  order: number | null;
  round: string | null;
  ts: string | null;
}

export interface Round {
  id: string;
  label: string;
  sub: string;
  depth: number;
}

export interface GameState {
  players: Player[];
  counter: number;
}
