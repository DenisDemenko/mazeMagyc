
export type Direction = 'top' | 'right' | 'bottom' | 'left';
export type BridgeDirection = 'horizontal' | 'vertical' | null;

export interface Walls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface Cell {
  x: number;
  y: number;
  walls: Walls;
  visited: boolean;
  isBridge: boolean;
  bridgeDirection: BridgeDirection;
  zone: number; // 0: default, 1: start side, 2: exit side
}

export interface KeyItem {
    x: number;
    y: number;
    collected: boolean;
    type: 'normal' | 'master'; // 'master' requires password
    char?: string; // The specific letter this key represents
}

export interface Barrier {
    x: number;
    y: number;
    isOpen: boolean;
    type: 'normal' | 'master'; // 'master' is the Green Laser
}

export interface MazeData {
  width: number;
  height: number;
  grid: Cell[][];
  bridges: Array<{ x: number; y: number; direction: BridgeDirection }>;
  keys: KeyItem[];
  barriers: Barrier[];
  entrance: { x: number; y: number; side: Direction } | null;
  exit: { x: number; y: number; side: Direction } | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  status: 'idle' | 'playing' | 'won';
  level: number;
}
