
import React, { useEffect, useRef, useState } from 'react';
import { MazeGenerator } from '../utils/mazeGenerator';
import { MazeData, Point, KeyItem, Barrier } from '../types';
import { MazeSize } from '../App';
import { audioManager } from '../utils/audioManager';
import { generateMazeSVG, downloadFile } from '../utils/fileUtils';
import { getPairForLevel } from '../data/secretWords';
import { xorDecipher } from '../utils/encryption';

interface GameCanvasProps {
  onWin: () => void;
  onExit: () => void;
  isActive: boolean;
  speedPercent: number;
  mazeSize: MazeSize;
  customMazeData: MazeData | null;
  isLoggedIn: boolean;
  config?: { enableTeleport: boolean; enableKeys: boolean; enableKitten: boolean; enableRobots: boolean };
  gameId: number; // Used to force regeneration
}

const CELL_SIZE = 40;
const BALL_RADIUS_BASE = 12;
const COLOR_WALL = '#ef4444'; 
const COLOR_BRIDGE = '#3b82f6'; 
const COLOR_BRIDGE_ACTIVE = '#06b6d4'; 
const COLOR_BALL = '#fbbf24'; 
const COLOR_TELEPORT = '#d946ef'; 
const COLOR_KEY = '#f59e0b'; 
const COLOR_KEY_MASTER = '#06b6d4'; 
const COLOR_BARRIER = '#f43f5e'; 
const COLOR_BARRIER_MASTER = '#22c55e'; 
const BRIDGE_BOOST_SPEED = 4.0; 

type TeleportState = 'hidden' | 'active' | 'warping_out' | 'warping_in';

interface TeleportPair {
    entry: Point;
    exit: Point;
}

interface TeleportSystem {
    enabled: boolean;
    state: TeleportState;
    pairs: TeleportPair[];
    destination: Point | null; 
    nextEventTime: number;
    animationStartTime: number;
}

// Kitten Types
type KittenState = 'waiting' | 'active' | 'leaving' | 'gone';
interface KittenSystem {
    enabled: boolean;
    state: KittenState;
    pos: Point;
    velocity: Point;
    spawnTime: number;
    leaveTime: number;
    nextMeowTime: number;
    targetCell: Point | null; 
}

// Robot Types
interface Robot {
    id: number;
    pos: Point;
    spawnTime: number;
    despawnTime: number;
    targetCell: Point | null;
}

interface RobotSystem {
    enabled: boolean;
    nextSpawnTime: number;
    robots: Robot[];
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onWin, onExit, isActive, speedPercent, mazeSize, customMazeData, isLoggedIn, config, gameId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mazeRef = useRef<MazeData | null>(null);
  
  const ballPos = useRef<Point>({ x: 0, y: 0 });
  const velocity = useRef<Point>({ x: 0, y: 0 });
  const currentScale = useRef<number>(1.0);
  const isElevated = useRef<boolean>(false);
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const wasOnBridge = useRef<boolean>(false); 
  
  const [showMenu, setShowMenu] = useState(false);
  
  // Word Construction State
  const [secretPair, setSecretPair] = useState<[string, string]>(['', '']);
  // REF IS CRITICAL: The game loop uses a closure created at start. 
  // It needs a ref to see the updated words after generation.
  const secretPairRef = useRef<[string, string]>(['', '']); 
  const [secretPairId, setSecretPairId] = useState<number>(0);
  
  // Sync Ref with State
  useEffect(() => {
      secretPairRef.current = secretPair;
  }, [secretPair]);

  // Helper to check which chars of a word are collected
  const getCollectedChars = (word: string): boolean[] => {
      if (!mazeRef.current) return new Array(word.length).fill(false);
      
      const collectedLetters = mazeRef.current.keys
          .filter(k => k.collected && k.char)
          .map(k => k.char!);
      
      const result: boolean[] = [];
      const usedIndices = new Set<number>();

      for (const char of word) {
          let found = false;
          for (let i = 0; i < collectedLetters.length; i++) {
              if (collectedLetters[i] === char && !usedIndices.has(i)) {
                  usedIndices.add(i);
                  found = true;
                  break;
              }
          }
          result.push(found);
      }
      return result;
  };
  
  // Re-calc collected state for UI
  const [word1Status, setWord1Status] = useState<boolean[]>([]);
  const [word2Status, setWord2Status] = useState<boolean[]>([]);

  const [showZoomHint, setShowZoomHint] = useState(false);
  
  const teleportRef = useRef<TeleportSystem>({
      enabled: false,
      state: 'hidden',
      pairs: [],
      destination: null,
      nextEventTime: 0,
      animationStartTime: 0
  });
  
  const kittenRef = useRef<KittenSystem>({
      enabled: false,
      state: 'waiting',
      pos: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      spawnTime: 0,
      leaveTime: 0,
      nextMeowTime: 0,
      targetCell: null
  });

  const robotRef = useRef<RobotSystem>({
      enabled: false,
      nextSpawnTime: 0,
      robots: []
  });
  
  const teleportConfigRef = useRef({ count: 0 });
  const teleportFallbackRef = useRef(false);

  const trailRef = useRef<Point[]>([]);
  const speedMultiplierRef = useRef(1.0);

  const camera = useRef({ x: 0, y: 0, scale: 1.0 });
  const isCameraInitialized = useRef(false);

  const touchStart = useRef<Point | null>(null); 
  const touchCurrent = useRef<Point | null>(null); 
  const joystickTilt = useRef<Point>({ x: 0, y: 0 });
  const gestureStart = useRef<{ dist: number; cx: number; cy: number; camScale: number; camX: number; camY: number } | null>(null);

  useEffect(() => {
    speedMultiplierRef.current = speedPercent / 100;
  }, [speedPercent]);

  useEffect(() => {
    if (isActive && mazeSize === 'small') {
        setShowZoomHint(true);
        const timer = setTimeout(() => setShowZoomHint(false), 3000);
        return () => clearTimeout(timer);
    } else {
        setShowZoomHint(false);
    }
  }, [isActive, mazeSize]);

  // Maze Generation Effect
  useEffect(() => {
      const enableTeleport = config?.enableTeleport ?? (mazeSize !== 'small');
      const enableKeys = config?.enableKeys ?? false;
      const enableKitten = config?.enableKitten ?? false;
      const enableRobots = config?.enableRobots ?? false;

      let teleportPairCount = 0;
      if (mazeSize === 'medium') teleportPairCount = 1;
      if (mazeSize === 'large') teleportPairCount = 2;
      if (mazeSize === 'xl') teleportPairCount = 3;
      if (mazeSize === 'hardcore') teleportPairCount = 4;
      if (!enableTeleport) teleportPairCount = 0;
      
      teleportConfigRef.current.count = teleportPairCount;
      teleportFallbackRef.current = false;

      // Prepare Secret Words
      const { pair, id } = getPairForLevel(mazeSize);
      const w1 = xorDecipher(pair.w1).toUpperCase();
      const w2 = xorDecipher(pair.w2).toUpperCase();
      setSecretPair([w1, w2]);
      secretPairRef.current = [w1, w2]; // Sync ref immediately for the loop
      setSecretPairId(id);
      
      // Initialize Status
      setWord1Status(new Array(w1.length).fill(false));
      setWord2Status(new Array(w2.length).fill(false));

      if (customMazeData) {
          mazeRef.current = customMazeData;
      } else {
          let w = 15, h = 19;
          if (mazeSize === 'medium') { w = 25; h = 31; }
          if (mazeSize === 'large') { w = 35; h = 45; }
          if (mazeSize === 'xl') { w = 41; h = 51; }
          if (mazeSize === 'hardcore') { w = 45; h = 65; }
          
          const genConfig = { 
              enableTeleport: enableTeleport,
              enableKeys: enableKeys,
              teleportPairs: teleportPairCount,
              secretWords: enableKeys ? [w1, w2] : undefined
          };

          const generator = new MazeGenerator(w, h);
          generator.generate(genConfig);
          mazeRef.current = generator.getData();
          
          teleportFallbackRef.current = true; 
      }
      
      ballPos.current = { x: CELL_SIZE * 0.5, y: CELL_SIZE * 0.5 };
      velocity.current = { x: 0, y: 0 };
      currentScale.current = 1.0;
      isElevated.current = false;
      isCameraInitialized.current = false;
      wasOnBridge.current = false;
      trailRef.current = [];
      
      const shouldUseTeleport = customMazeData 
          ? (customMazeData.width > 15)
          : (enableTeleport && teleportPairCount > 0);

      teleportRef.current = {
          enabled: !!shouldUseTeleport,
          state: 'hidden',
          pairs: [],
          destination: null,
          nextEventTime: Date.now() + 5000,
          animationStartTime: 0
      };
      
      const now = Date.now();
      kittenRef.current = {
          enabled: enableKitten,
          state: 'waiting',
          pos: { x: -100, y: -100 },
          velocity: { x: 0, y: 0 },
          spawnTime: now + 45000, 
          leaveTime: 0,
          nextMeowTime: 0,
          targetCell: null
      };

      robotRef.current = {
          enabled: enableRobots,
          nextSpawnTime: now + 7000, 
          robots: []
      };

  }, [mazeSize, customMazeData, config?.enableTeleport, config?.enableKeys, config?.enableKitten, config?.enableRobots, gameId]);

  const updateKeyStatus = () => {
      if (mazeRef.current) {
          // Use Ref current value to avoid stale closure issues in the game loop
          const w1 = secretPairRef.current[0];
          const w2 = secretPairRef.current[1];
          setWord1Status(getCollectedChars(w1));
          setWord2Status(getCollectedChars(w2));
      }
  };

  // --- TOUCH HANDLERS ---
  const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (t1: React.Touch, t2: React.Touch) => {
      return {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
      };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
          touchCurrent.current = { x: t.clientX, y: t.clientY };
          joystickTilt.current = { x: 0, y: 0 };
      } else if (e.touches.length === 2) {
          const dist = getTouchDist(e.touches[0], e.touches[1]);
          const center = getTouchCenter(e.touches[0], e.touches[1]);
          gestureStart.current = {
              dist,
              cx: center.x,
              cy: center.y,
              camScale: camera.current.scale,
              camX: camera.current.x,
              camY: camera.current.y
          };
          touchStart.current = null; 
          joystickTilt.current = { x: 0, y: 0 };
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 1 && touchStart.current) {
          const t = e.touches[0];
          touchCurrent.current = { x: t.clientX, y: t.clientY };
          
          const dx = t.clientX - touchStart.current.x;
          const dy = t.clientY - touchStart.current.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const maxDist = 150; 
          
          const clampedDist = Math.min(dist, maxDist);
          const normalized = clampedDist / maxDist;
          
          if (dist > 0) {
              joystickTilt.current = {
                  x: (dx / dist) * normalized,
                  y: (dy / dist) * normalized
              };
          }
      } else if (e.touches.length === 2 && gestureStart.current) {
          const dist = getTouchDist(e.touches[0], e.touches[1]);
          const center = getTouchCenter(e.touches[0], e.touches[1]);
          const gs = gestureStart.current;
          
          const scaleFactor = dist / gs.dist;
          let newScale = gs.camScale * scaleFactor;
          newScale = Math.max(0.2, Math.min(newScale, 3.0)); 
          
          const dx = center.x - gs.cx;
          const dy = center.y - gs.cy;
          
          camera.current = {
              scale: newScale,
              x: gs.camX + dx,
              y: gs.camY + dy
          };
      }
  };

  const handleTouchEnd = () => {
      touchStart.current = null;
      touchCurrent.current = null;
      gestureStart.current = null;
      joystickTilt.current = { x: 0, y: 0 };
  };

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
      // Middle Mouse Button (button 1) for Panning
      if (e.button === 1) {
          gestureStart.current = {
              dist: 0, // not used for pan
              cx: e.clientX,
              cy: e.clientY,
              camScale: camera.current.scale,
              camX: camera.current.x,
              camY: camera.current.y
          };
          return;
      }
      // Left Click for Joystick
      if (e.button !== 0) return;
      touchStart.current = { x: e.clientX, y: e.clientY };
      touchCurrent.current = { x: e.clientX, y: e.clientY };
      joystickTilt.current = { x: 0, y: 0 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      // Pan Logic
      if (gestureStart.current) {
          const dx = e.clientX - gestureStart.current.cx;
          const dy = e.clientY - gestureStart.current.cy;
          camera.current.x = gestureStart.current.camX + dx;
          camera.current.y = gestureStart.current.camY + dy;
          return;
      }

      // Joystick Logic
      if (touchStart.current) {
          touchCurrent.current = { x: e.clientX, y: e.clientY };
          const dx = e.clientX - touchStart.current.x;
          const dy = e.clientY - touchStart.current.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          const maxDist = 150;
          const clampedDist = Math.min(dist, maxDist);
          const normalized = clampedDist / maxDist;
          if (dist > 0) {
              joystickTilt.current = {
                  x: (dx / dist) * normalized,
                  y: (dy / dist) * normalized
              };
          }
      }
  };

  const handleMouseUp = () => {
      touchStart.current = null;
      touchCurrent.current = null;
      gestureStart.current = null;
      joystickTilt.current = { x: 0, y: 0 };
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const newScale = camera.current.scale - e.deltaY * zoomSpeed;
      const clampedScale = Math.max(0.2, Math.min(newScale, 3.0));
      camera.current.scale = clampedScale;
  };

  const saveJSON = () => {
      if (!mazeRef.current) return;
      const json = JSON.stringify(mazeRef.current, null, 2);
      downloadFile(json, `maze_${Date.now()}.json`, 'json');
      setShowMenu(false);
  };

  const saveSVG = () => {
      if (!mazeRef.current) return;
      const svg = generateMazeSVG(mazeRef.current);
      downloadFile(svg, `maze_${Date.now()}.svg`, 'svg');
      setShowMenu(false);
  };

  const drawGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!mazeRef.current) return;

    const width = canvas.width;
    const height = canvas.height;
    const time = Date.now();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1c1917'; 
    ctx.fillRect(0, 0, width, height);
    
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr); 
    ctx.translate(camera.current.x, camera.current.y);
    ctx.scale(camera.current.scale, camera.current.scale);

    const maze = mazeRef.current;

    // Walls
    maze.grid.forEach(row => {
      row.forEach(cell => {
        const x = cell.x * CELL_SIZE;
        const y = cell.y * CELL_SIZE;
        ctx.strokeStyle = COLOR_WALL;
        ctx.lineWidth = 3;
        ctx.lineCap = 'square'; 
        ctx.beginPath();
        if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + CELL_SIZE, y); }
        if (cell.walls.right) { ctx.moveTo(x + CELL_SIZE, y); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); }
        if (cell.walls.bottom) { ctx.moveTo(x, y + CELL_SIZE); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); }
        if (cell.walls.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + CELL_SIZE); }
        ctx.stroke();
      });
    });

    // Bridges
    const ballCellX = Math.floor(ballPos.current.x / CELL_SIZE);
    const ballCellY = Math.floor(ballPos.current.y / CELL_SIZE);

    maze.grid.forEach(row => {
        row.forEach(cell => {
            if (cell.isBridge) {
                const x = cell.x * CELL_SIZE;
                const y = cell.y * CELL_SIZE;
                const isActiveBridge = isElevated.current && cell.x === ballCellX && cell.y === ballCellY;
                
                ctx.beginPath();
                if (isActiveBridge) {
                    ctx.strokeStyle = COLOR_BRIDGE_ACTIVE;
                    ctx.lineWidth = 4;
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = COLOR_BRIDGE_ACTIVE;
                    ctx.setLineDash([8, 8]);
                    ctx.lineDashOffset = -time / 4; 
                    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                } else {
                    ctx.strokeStyle = COLOR_BRIDGE;
                    ctx.lineWidth = 3;
                    ctx.shadowBlur = 0;
                    ctx.setLineDash([6, 6]); 
                    ctx.lineDashOffset = -time / 20; 
                }

                if (cell.bridgeDirection === 'horizontal') {
                    ctx.moveTo(x, y + 4); ctx.lineTo(x + CELL_SIZE, y + 4);
                    ctx.moveTo(x, y + CELL_SIZE - 4); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - 4);
                } else {
                    ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y + CELL_SIZE);
                    ctx.moveTo(x + CELL_SIZE - 4, y); ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE);
                }
                ctx.stroke();
                ctx.setLineDash([]); 
                ctx.shadowBlur = 0;
                ctx.shadowColor = 'transparent';
            }
        });
    });

    // Keys (Letters)
    maze.keys.forEach(k => {
        if (!k.collected) {
            const cx = k.x * CELL_SIZE + CELL_SIZE/2;
            const cy = k.y * CELL_SIZE + CELL_SIZE/2;
            const isMaster = k.type === 'master';
            
            ctx.save();
            ctx.translate(cx, cy);
            
            if (isMaster) {
                const pulse = Math.sin(time/200) * 0.2 + 1;
                ctx.scale(pulse, pulse);
                
                if (k.char) {
                    // Draw Letter
                    ctx.fillStyle = '#fbbf24'; // Amber
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 15;
                    ctx.font = 'bold 24px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(k.char, 0, 2);
                } else {
                    // Fallback generic key
                    ctx.fillStyle = COLOR_KEY_MASTER;
                    ctx.shadowColor = COLOR_KEY_MASTER;
                    ctx.shadowBlur = 10;
                    const size = 20;
                    const r = 4;
                    ctx.beginPath();
                    ctx.roundRect(-size/2, -size/2, size, size, r);
                    ctx.fill();
                    ctx.fillStyle = '#000';
                    ctx.font = '14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🔑', 0, 1);
                }
            }
            ctx.restore();
        }
    });

    // Barriers
    maze.barriers.forEach(b => {
        if (!b.isOpen) {
            const cx = b.x * CELL_SIZE;
            const cy = b.y * CELL_SIZE;
            const isMaster = b.type === 'master';
            const color = isMaster ? COLOR_BARRIER_MASTER : COLOR_BARRIER;
            
            ctx.save();
            const opacity = 0.4 + Math.sin(Date.now()/100)*0.2;
            ctx.fillStyle = isMaster ? `rgba(34, 197, 94, ${opacity})` : `rgba(244, 63, 94, ${opacity})`; 
            ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy); ctx.lineTo(cx+CELL_SIZE, cy+CELL_SIZE);
            ctx.moveTo(cx+CELL_SIZE, cy); ctx.lineTo(cx, cy+CELL_SIZE);
            ctx.stroke();
            if (isMaster) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.stroke();
            }
            ctx.restore();
        }
    });

    // Teleports
    const ts = teleportRef.current;
    if (ts.enabled && ts.state !== 'hidden' && ts.pairs.length > 0) {
        const pulse = Math.sin(Date.now() / 200) * 5;
        ts.pairs.forEach(pair => {
            [pair.entry, pair.exit].forEach(pt => {
                const ex = pt.x * CELL_SIZE + CELL_SIZE / 2;
                const ey = pt.y * CELL_SIZE + CELL_SIZE / 2;
                ctx.strokeStyle = COLOR_TELEPORT;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ex, ey, 8 + pulse, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(ex, ey, 14 - pulse, 0, Math.PI * 2);
                ctx.stroke();
            });
        });
    }

    // KITTEN
    const kitten = kittenRef.current;
    if (kitten.enabled && kitten.state !== 'waiting' && kitten.state !== 'gone') {
        const cx = kitten.pos.x;
        const cy = kitten.pos.y;
        const opacity = kitten.state === 'leaving' ? 0.5 : 1;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = '#9ca3af'; 
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b7280';
        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 6); ctx.lineTo(cx - 12, cy - 14); ctx.lineTo(cx - 2, cy - 8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 8, cy - 6); ctx.lineTo(cx + 12, cy - 14); ctx.lineTo(cx + 2, cy - 8); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath(); ctx.arc(cx, cy + 2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ROBOTS
    const rs = robotRef.current;
    if (rs.enabled && rs.robots.length > 0) {
        rs.robots.forEach(robot => {
            const cx = robot.pos.x;
            const cy = robot.pos.y;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(time/100)*5, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; ctx.fill();
            ctx.fillStyle = '#4b5563'; ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    }

    if (maze.entrance) {
      ctx.fillStyle = '#16a34a'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('START', maze.entrance.x * CELL_SIZE + 2, maze.entrance.y * CELL_SIZE + 25);
    }
    if (maze.exit) {
      ctx.fillStyle = '#dc2626'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText('EXIT', maze.exit.x * CELL_SIZE + 8, maze.exit.y * CELL_SIZE + 25);
    }

    const renderScale = currentScale.current;
    const isPhysicallyElevated = isElevated.current;
    const shadowOffset = isPhysicallyElevated ? 0 : 2;
    const shadowBlur = isPhysicallyElevated ? 20 : 5;
    const shadowColor = isPhysicallyElevated ? 'rgba(59, 130, 246, 0.8)' : 'rgba(0,0,0,0.4)';

    if (trailRef.current.length > 0) {
        ctx.beginPath();
        ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y);
        for (let i = 1; i < trailRef.current.length; i++) {
            ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y);
        }
        ctx.lineWidth = BALL_RADIUS_BASE * renderScale;
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(251, 191, 36, 0.3)`;
        ctx.stroke();
    }

    if (renderScale > 0.05) {
        ctx.shadowColor = shadowColor; ctx.shadowBlur = shadowBlur; ctx.shadowOffsetY = shadowOffset;
        ctx.fillStyle = COLOR_BALL;
        ctx.beginPath(); ctx.arc(ballPos.current.x, ballPos.current.y, BALL_RADIUS_BASE * renderScale, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(ballPos.current.x - (3 * renderScale), ballPos.current.y - (3 * renderScale), BALL_RADIUS_BASE * renderScale * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); 

    // Joystick Overlay
    if (touchStart.current && touchCurrent.current) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath(); ctx.arc(touchStart.current.x, touchStart.current.y, 150, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(touchCurrent.current.x, touchCurrent.current.y, 40, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'; ctx.stroke();
        ctx.restore();
    }
  };

  // Physics Loop
  useEffect(() => {
    if (!isActive) return;

    audioManager.startRolling();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let animationFrameId: number;
    
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const updateSize = () => {
        if (canvas && mazeRef.current) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                if (!isCameraInitialized.current) {
                    const logicalW = rect.width;
                    const logicalH = rect.height;
                    const mazeW = mazeRef.current.width * CELL_SIZE;
                    const mazeH = mazeRef.current.height * CELL_SIZE;
                    const safeMargin = 40;
                    const bottomUIHeight = 120; 
                    const availableWidth = logicalW - safeMargin;
                    const availableHeight = logicalH - bottomUIHeight - safeMargin;
                    const scaleX = availableWidth / (mazeW + safeMargin);
                    const scaleY = availableHeight / (mazeH + safeMargin);
                    let startScale = Math.min(scaleX, scaleY, 1.5);
                    if (mazeSize === 'small') startScale = startScale * 0.75;

                    const startX = (logicalW - mazeW * startScale) / 2;
                    const startY = (availableHeight - mazeH * startScale) / 2 + safeMargin;
                    
                    camera.current = { x: startX, y: startY, scale: startScale };
                    isCameraInitialized.current = true;
                }
                const context = canvas.getContext('2d');
                if (context) drawGame(context, canvas);
            }
        }
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    const findRandomFloorCellInZone = (maze: MazeData, targetZone: number): Point | null => {
        let tries = 0;
        while (tries < 200) {
            const rx = Math.floor(Math.random() * maze.width);
            const ry = Math.floor(Math.random() * maze.height);
            const cell = maze.grid[ry][rx];
            if (cell.zone === targetZone && !cell.isBridge && 
                !(rx === maze.entrance?.x && ry === maze.entrance?.y) &&
                !(rx === maze.exit?.x && ry === maze.exit?.y)) {
                return { x: rx, y: ry };
            }
            tries++;
        }
        if (tries >= 200 && (targetZone > 1 || teleportFallbackRef.current)) {
             while (tries < 400) {
                const rx = Math.floor(Math.random() * maze.width);
                const ry = Math.floor(Math.random() * maze.height);
                const cell = maze.grid[ry][rx];
                if (!cell.isBridge && 
                    !(rx === maze.entrance?.x && ry === maze.entrance?.y) &&
                    !(rx === maze.exit?.x && ry === maze.exit?.y)) {
                    if (rx + ry > 10) return { x: rx, y: ry };
                }
                tries++;
             }
        }
        return null;
    };

    const respawn = () => {
        ballPos.current = { x: CELL_SIZE * 0.5, y: CELL_SIZE * 0.5 };
        velocity.current = { x: 0, y: 0 };
        isElevated.current = false;
        currentScale.current = 1.0;
        audioManager.playCollision(10);
        if (navigator.vibrate) navigator.vibrate(200);
    };

    const getNextStepToTarget = (start: Point, end: Point): Point => {
        const grid = mazeRef.current?.grid;
        if (!grid) return start;
        const startKey = `${start.x},${start.y}`;
        const endKey = `${end.x},${end.y}`;
        if (startKey === endKey) return start;
        const queue: Point[] = [start];
        const visited = new Set<string>([startKey]);
        const parentMap = new Map<string, Point>();
        while (queue.length > 0) {
            const curr = queue.shift()!;
            if (curr.x === end.x && curr.y === end.y) {
                let pathNode = curr;
                let prevNode = parentMap.get(`${pathNode.x},${pathNode.y}`);
                while (prevNode && (prevNode.x !== start.x || prevNode.y !== start.y)) {
                    pathNode = prevNode;
                    prevNode = parentMap.get(`${pathNode.x},${pathNode.y}`);
                }
                return pathNode;
            }
            const cell = grid[curr.y][curr.x];
            const neighbors = [{ dx: 0, dy: -1, wall: 'top' }, { dx: 1, dy: 0, wall: 'right' }, { dx: 0, dy: 1, wall: 'bottom' }, { dx: -1, dy: 0, wall: 'left' }];
            for (const n of neighbors) {
                const nx = curr.x + n.dx;
                const ny = curr.y + n.dy;
                if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length) {
                    if (!cell.walls[n.wall as 'top'|'bottom'|'left'|'right']) {
                         const nKey = `${nx},${ny}`;
                         if (!visited.has(nKey)) {
                             visited.add(nKey);
                             parentMap.set(nKey, curr);
                             queue.push({ x: nx, y: ny });
                         }
                    }
                }
            }
        }
        return start; 
    };

    const loop = () => {
        if (mazeRef.current) {
            const { width, height, grid, exit, keys, barriers } = mazeRef.current;
            const now = Date.now();
            const ts = teleportRef.current;
            const ks = kittenRef.current;
            const rs = robotRef.current;
            const requiredPairs = teleportConfigRef.current.count;
            
            // ... (Kitten and Robot Logic remains identical to previous version, condensed for brevity here) ...
            if (ks.enabled) {
                 if (ks.state === 'waiting' && now > ks.spawnTime) {
                    const range = 5;
                    const px = Math.floor(ballPos.current.x / CELL_SIZE);
                    const py = Math.floor(ballPos.current.y / CELL_SIZE);
                    let spawned = false;
                    for (let i=0; i<50; i++) {
                        const kx = Math.max(0, Math.min(width-1, px + (Math.floor(Math.random()*range*2)-range)));
                        const ky = Math.max(0, Math.min(height-1, py + (Math.floor(Math.random()*range*2)-range)));
                        if (!grid[ky][kx].isBridge && grid[ky][kx].walls.top) {
                             ks.pos = { x: kx*CELL_SIZE + CELL_SIZE/2, y: ky*CELL_SIZE + CELL_SIZE/2 };
                             ks.state = 'active'; ks.leaveTime = now + 20000; ks.targetCell = null;
                             audioManager.playMeow(); spawned = true; break;
                        }
                    }
                    if (!spawned) ks.spawnTime = now + 5000;
                }
                if (ks.state === 'active') {
                    if (now > ks.leaveTime) ks.state = 'leaving';
                    if (now > ks.nextMeowTime) { audioManager.playMeow(); ks.nextMeowTime = now + 5000 + Math.random() * 5000; }
                    const kCellX = Math.floor(ks.pos.x / CELL_SIZE); const kCellY = Math.floor(ks.pos.y / CELL_SIZE);
                    const pCellX = Math.floor(ballPos.current.x / CELL_SIZE); const pCellY = Math.floor(ballPos.current.y / CELL_SIZE);
                    if (!ks.targetCell || (kCellX === ks.targetCell.x && kCellY === ks.targetCell.y)) {
                        ks.targetCell = getNextStepToTarget({ x: kCellX, y: kCellY }, { x: pCellX, y: pCellY });
                    }
                    const targetPx = ks.targetCell.x * CELL_SIZE + CELL_SIZE / 2; const targetPy = ks.targetCell.y * CELL_SIZE + CELL_SIZE / 2;
                    const dx = targetPx - ks.pos.x; const dy = targetPy - ks.pos.y; const distToTarget = Math.hypot(dx, dy);
                    if (distToTarget > 2) { const speed = 5.0; ks.pos.x += (dx / distToTarget) * speed; ks.pos.y += (dy / distToTarget) * speed; } else { ks.pos.x = targetPx; ks.pos.y = targetPy; }
                    const distToBall = Math.hypot(ballPos.current.x - ks.pos.x, ballPos.current.y - ks.pos.y);
                    if (distToBall < BALL_RADIUS_BASE + 15) {
                        const pushForce = 5.0;
                        velocity.current.x += (Math.random() - 0.5) * pushForce; velocity.current.y += (Math.random() - 0.5) * pushForce;
                        if (navigator.vibrate) navigator.vibrate(50);
                    }
                }
                if (ks.state === 'leaving') {
                    if (now > ks.leaveTime + 2000) { ks.state = 'waiting'; ks.spawnTime = now + 15000; ks.pos = { x: -100, y: -100 }; }
                }
            }
            if (rs.enabled) {
                if (now > rs.nextSpawnTime) {
                    const px = Math.floor(ballPos.current.x / CELL_SIZE); const py = Math.floor(ballPos.current.y / CELL_SIZE);
                    const spawnRadius = 10; const minRadius = 4;
                    for (let i = 0; i < 2; i++) {
                        for (let attempt = 0; attempt < 20; attempt++) {
                            const dx = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * (spawnRadius - minRadius)) + minRadius);
                            const dy = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * (spawnRadius - minRadius)) + minRadius);
                            const rx = Math.max(0, Math.min(width - 1, px + dx)); const ry = Math.max(0, Math.min(height - 1, py + dy));
                            const cell = grid[ry][rx];
                            if (!cell.isBridge && !cell.walls.top) {
                                rs.robots.push({ id: Date.now() + i, pos: { x: rx * CELL_SIZE + CELL_SIZE/2, y: ry * CELL_SIZE + CELL_SIZE/2 }, spawnTime: now, despawnTime: now + 10000, targetCell: null });
                                break;
                            }
                        }
                    }
                    audioManager.playRobotSpawn(); rs.nextSpawnTime = now + 25000;
                }
                for (let i = rs.robots.length - 1; i >= 0; i--) {
                    const robot = rs.robots[i];
                    if (now > robot.despawnTime) { rs.robots.splice(i, 1); continue; }
                    const rCellX = Math.floor(robot.pos.x / CELL_SIZE); const rCellY = Math.floor(robot.pos.y / CELL_SIZE);
                    const pCellX = Math.floor(ballPos.current.x / CELL_SIZE); const pCellY = Math.floor(ballPos.current.y / CELL_SIZE);
                    if (!robot.targetCell || (rCellX === robot.targetCell.x && rCellY === robot.targetCell.y)) { robot.targetCell = getNextStepToTarget({ x: rCellX, y: rCellY }, { x: pCellX, y: pCellY }); }
                    const targetPx = robot.targetCell.x * CELL_SIZE + CELL_SIZE / 2; const targetPy = robot.targetCell.y * CELL_SIZE + CELL_SIZE / 2;
                    const dx = targetPx - robot.pos.x; const dy = targetPy - robot.pos.y; const distToTarget = Math.hypot(dx, dy);
                    if (distToTarget > 2) { const speed = 3.5; robot.pos.x += (dx / distToTarget) * speed; robot.pos.y += (dy / distToTarget) * speed; } else { robot.pos.x = targetPx; robot.pos.y = targetPy; }
                    const distToBall = Math.hypot(ballPos.current.x - robot.pos.x, ballPos.current.y - robot.pos.y);
                    if (distToBall < BALL_RADIUS_BASE + 12) { respawn(); }
                }
            }
             if (ts.enabled) {
                if (ts.state === 'hidden' && now > ts.nextEventTime) {
                    const newPairs: TeleportPair[] = [];
                    for(let i=0; i<requiredPairs; i++) {
                        const entry = findRandomFloorCellInZone(mazeRef.current, i + 1);
                        const exit = findRandomFloorCellInZone(mazeRef.current, i + 2);
                        if (entry && exit) newPairs.push({ entry, exit });
                    }
                    if (newPairs.length > 0) { ts.state = 'active'; ts.pairs = newPairs; ts.nextEventTime = now + 10000; } 
                    else { ts.nextEventTime = now + 1000; }
                } else if (ts.state === 'active' && now > ts.nextEventTime) { ts.state = 'hidden'; ts.pairs = []; ts.nextEventTime = now + 30000; }
            }
            if (ts.state === 'warping_out') {
                 const progress = (now - ts.animationStartTime) / 1000; 
                 if (progress >= 1) { ts.state = 'warping_in'; ts.animationStartTime = now; if (ts.destination) { ballPos.current = { x: ts.destination.x * CELL_SIZE + CELL_SIZE/2, y: ts.destination.y * CELL_SIZE + CELL_SIZE/2 }; } currentScale.current = 0; } else { currentScale.current = 1.0 - progress; }
                 velocity.current = {x:0, y:0};
            } else if (ts.state === 'warping_in') {
                const progress = (now - ts.animationStartTime) / 1000;
                if (progress >= 1) { ts.state = 'hidden'; ts.pairs = []; ts.destination = null; ts.nextEventTime = now + 30000; currentScale.current = 1.0; } else { currentScale.current = progress; }
                 velocity.current = {x:0, y:0};
            } else {
                let tiltX = 0, tiltY = 0;
                if (joystickTilt.current.x !== 0 || joystickTilt.current.y !== 0) {
                    tiltX = joystickTilt.current.x * 1.5; tiltY = joystickTilt.current.y * 1.5;
                } else {
                    if (keysPressed.current['ArrowUp']) tiltY = -1;
                    if (keysPressed.current['ArrowDown']) tiltY = 1;
                    if (keysPressed.current['ArrowLeft']) tiltX = -1;
                    if (keysPressed.current['ArrowRight']) tiltX = 1;
                }

                const BASE_ACCEL = 0.4;
                const ACCEL = BASE_ACCEL * speedMultiplierRef.current;
                
                let cellX = Math.floor(ballPos.current.x / CELL_SIZE);
                let cellY = Math.floor(ballPos.current.y / CELL_SIZE);
                const clampedCellX = Math.max(0, Math.min(width - 1, cellX));
                const clampedCellY = Math.max(0, Math.min(height - 1, cellY));
                const currentCell = grid[clampedCellY][clampedCellX];
                const onBridge = isElevated.current; 

                // --- KEY COLLECTION LOGIC ---
                // Strict Collection: Ball must be in same grid cell as Key
                keys.forEach((k) => {
                    if (!k.collected) {
                        // Strict check: integer grid coordinates must match
                        if (k.x === clampedCellX && k.y === clampedCellY) {
                             k.collected = true;
                             audioManager.playKeyPickup();
                             if (navigator.vibrate) navigator.vibrate(50);
                             updateKeyStatus();
                             
                             // Check if all master keys are collected
                             const allMasterCollected = keys.every(key => key.type !== 'master' || key.collected);
                             if (allMasterCollected) {
                                 barriers.forEach(b => { 
                                     if (b.type === 'master' && !b.isOpen) { 
                                         b.isOpen = true; 
                                         audioManager.playBarrierOpen(); 
                                     } 
                                 });
                             }
                        }
                    }
                });

                if (ts.enabled && ts.state === 'active') {
                    const checkTeleportTrigger = (pt: Point, dest: Point) => {
                        if (cellX === pt.x && cellY === pt.y) {
                            const dx = ballPos.current.x - (pt.x * CELL_SIZE + CELL_SIZE/2);
                            const dy = ballPos.current.y - (pt.y * CELL_SIZE + CELL_SIZE/2);
                            if (Math.sqrt(dx*dx + dy*dy) < CELL_SIZE * 0.4) {
                                ts.state = 'warping_out'; ts.animationStartTime = now; ts.destination = dest; 
                                audioManager.playTeleport(); if (navigator.vibrate) navigator.vibrate(200); velocity.current = {x:0,y:0};
                                return true;
                            }
                        }
                        return false;
                    };
                    let triggered = false;
                    for (const pair of ts.pairs) {
                        if (checkTeleportTrigger(pair.entry, pair.exit)) { triggered = true; break; }
                        else if (checkTeleportTrigger(pair.exit, pair.entry)) { triggered = true; break; }
                    }
                    if (triggered) { if (canvas && ctx) drawGame(ctx, canvas); animationFrameId = requestAnimationFrame(loop); return; }
                }

                const speed = Math.hypot(velocity.current.x, velocity.current.y);
                audioManager.updateRolling(speed);
                if (onBridge && !wasOnBridge.current) audioManager.playBridgeEnter();
                wasOnBridge.current = onBridge;

                if (onBridge) {
                    currentScale.current += (1.5 - currentScale.current) * 0.2;
                    if (currentCell.isBridge) {
                         if (currentCell.bridgeDirection === 'horizontal') {
                            let dirX = Math.sign(velocity.current.x);
                            if (dirX === 0) dirX = Math.sign(tiltX) || 1;
                            velocity.current.x = dirX * BRIDGE_BOOST_SPEED * speedMultiplierRef.current;
                            velocity.current.y += tiltY * ACCEL; velocity.current.y *= 0.8; 
                         } else {
                            let dirY = Math.sign(velocity.current.y);
                            if (dirY === 0) dirY = Math.sign(tiltY) || 1;
                            velocity.current.y = dirY * BRIDGE_BOOST_SPEED * speedMultiplierRef.current;
                            velocity.current.x += tiltX * ACCEL; velocity.current.x *= 0.8;
                         }
                    }
                    trailRef.current.push({ ...ballPos.current });
                    if (trailRef.current.length > 5) trailRef.current.shift();
                } else {
                    currentScale.current += (1.0 - currentScale.current) * 0.1;
                    velocity.current.x += tiltX * ACCEL; velocity.current.y += tiltY * ACCEL;
                    velocity.current.x *= 0.95; velocity.current.y *= 0.95;
                    trailRef.current = [];
                }

                if (speedMultiplierRef.current === 0) velocity.current = {x:0, y:0};
                
                let nextX = ballPos.current.x + velocity.current.x;
                let nextY = ballPos.current.y + velocity.current.y;
                const r = BALL_RADIUS_BASE * currentScale.current;

                const checkBarrier = (cx: number, cy: number) => barriers.some(b => !b.isOpen && b.x === cx && b.y === cy);
                const bounceX = () => { audioManager.playCollision(Math.abs(velocity.current.x)); if (navigator.vibrate && Math.abs(velocity.current.x) > 2) navigator.vibrate(10); velocity.current.x *= -0.5; };
                const bounceY = () => { audioManager.playCollision(Math.abs(velocity.current.y)); if (navigator.vibrate && Math.abs(velocity.current.y) > 2) navigator.vibrate(10); velocity.current.y *= -0.5; };
                const checkTransparent = (cx: number, cy: number, dir: 'left' | 'right' | 'top' | 'bottom') => {
                    if (cx < 0 || cx >= width || cy < 0 || cy >= height) return false;
                    const cell = grid[cy][cx];
                    if (!cell.isBridge) return false;
                    if (cell.bridgeDirection === 'horizontal' && (dir === 'left' || dir === 'right')) return true;
                    if (cell.bridgeDirection === 'vertical' && (dir === 'top' || dir === 'bottom')) return true;
                    return false;
                };

                if (velocity.current.x > 0) { 
                    const edgeX = (cellX + 1) * CELL_SIZE;
                    if (nextX + r > edgeX) {
                        const barrierThere = checkBarrier(cellX + 1, cellY); let isWall = false;
                        if (isElevated.current && !currentCell.isBridge) { if (currentCell.walls.right) isWall = true; } 
                        else if (isElevated.current) { if (currentCell.bridgeDirection === 'vertical') isWall = true; } 
                        else { if (currentCell.walls.right) { if (!checkTransparent(cellX + 1, cellY, 'left')) isWall = true; else isElevated.current = true; } }
                        if (cellX + 1 >= width) isWall = true;
                        if ((isWall || barrierThere)) { nextX = edgeX - r - 0.1; bounceX(); }
                    }
                } else if (velocity.current.x < 0) { 
                    const edgeX = cellX * CELL_SIZE;
                    if (nextX - r < edgeX) {
                        const barrierThere = checkBarrier(cellX - 1, cellY); let isWall = false;
                        if (isElevated.current && !currentCell.isBridge) { if (currentCell.walls.left) isWall = true; } 
                        else if (isElevated.current) { if (currentCell.bridgeDirection === 'vertical') isWall = true; } 
                        else { if (currentCell.walls.left) { if (!checkTransparent(cellX - 1, cellY, 'right')) isWall = true; else isElevated.current = true; } }
                        if (cellX - 1 < 0) isWall = true;
                        if ((isWall || barrierThere)) { nextX = edgeX + r + 0.1; bounceX(); }
                    }
                }

                if (velocity.current.y > 0) { 
                    const edgeY = (cellY + 1) * CELL_SIZE;
                    if (nextY + r > edgeY) {
                         const barrierThere = checkBarrier(cellX, cellY + 1); let isWall = false;
                         if (isElevated.current && !currentCell.isBridge) { if (currentCell.walls.bottom) isWall = true; } 
                         else if (isElevated.current) { if (currentCell.bridgeDirection === 'horizontal') isWall = true; } 
                         else { if (currentCell.walls.bottom) { if (!checkTransparent(cellX, cellY + 1, 'top')) isWall = true; else isElevated.current = true; } }
                         if (cellY + 1 >= height) isWall = true;
                         if ((isWall || barrierThere)) { nextY = edgeY - r - 0.1; bounceY(); }
                    }
                } else if (velocity.current.y < 0) { 
                    const edgeY = cellY * CELL_SIZE;
                    if (nextY - r < edgeY) {
                         const barrierThere = checkBarrier(cellX, cellY - 1); let isWall = false;
                         if (isElevated.current && !currentCell.isBridge) { if (currentCell.walls.top) isWall = true; } 
                         else if (isElevated.current) { if (currentCell.bridgeDirection === 'horizontal') isWall = true; } 
                         else { if (currentCell.walls.top) { if (!checkTransparent(cellX, cellY - 1, 'bottom')) isWall = true; else isElevated.current = true; } }
                         if (cellY - 1 < 0) isWall = true;
                         if ((isWall || barrierThere)) { nextY = edgeY + r + 0.1; bounceY(); }
                    }
                }

                ballPos.current.x = nextX;
                ballPos.current.y = nextY;

                const newCellX = Math.floor(nextX/CELL_SIZE);
                const newCellY = Math.floor(nextY/CELL_SIZE);
                if (newCellX >= 0 && newCellX < width && newCellY >= 0 && newCellY < height) {
                    const newCell = grid[newCellY][newCellX];
                    if (isElevated.current && !newCell.isBridge) { isElevated.current = false; }
                }
                if (exit && cellX === exit.x && cellY === exit.y) { audioManager.playWin(); onWin(); }
            }
            if (canvas && ctx) drawGame(ctx, canvas);
        }
        animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', updateSize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        audioManager.stopRolling();
    };
  }, [isActive]); 

  const renderWord = (word: string, status: boolean[]) => (
      <div className="flex gap-1">
          {word.split('').map((char, i) => (
              <div 
                key={i} 
                className={`w-6 h-8 flex items-center justify-center rounded font-bold font-mono text-lg border 
                    ${status[i] 
                        ? 'bg-amber-500 text-black border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                        : 'bg-stone-800 text-stone-600 border-stone-700'
                    }`}
              >
                  {status[i] ? char : '_'}
              </div>
          ))}
      </div>
  );

  return (
    <div 
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
    >
      <canvas 
        ref={canvasRef} 
        className="rounded-lg shadow-2xl bg-stone-800 touch-none" 
        style={{ maxWidth: '100%', maxHeight: '100%' }} 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {showZoomHint && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in fade-in duration-500">
              <div className="bg-black/70 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/20 text-center shadow-xl">
                  <div className="text-4xl mb-2">✌️</div>
                  <p className="text-white font-bold text-sm">для масштабу скористайтеся</p>
                  <p className="text-amber-400 font-bold text-sm">скролінгом двома пальцями</p>
              </div>
          </div>
      )}

      {/* WORD CONSTRUCTION UI */}
      {config?.enableKeys && (secretPair[0] || secretPair[1]) && (
          <div className="absolute top-4 z-30 flex flex-col items-center gap-2 animate-in slide-in-from-top-4">
              <div className="bg-stone-900/90 border border-amber-500/30 px-4 py-2 rounded-xl flex flex-col items-center gap-2 shadow-2xl backdrop-blur-md">
                  <div className="flex flex-col items-center gap-2">
                     {secretPair[0] && renderWord(secretPair[0], word1Status)}
                     {secretPair[1] && renderWord(secretPair[1], word2Status)}
                  </div>
              </div>
              <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded">
                  Код #{secretPairId}
              </div>
          </div>
      )}

      <div className="absolute top-4 left-4 z-40">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 bg-stone-800/80 rounded-full border border-stone-600 flex items-center justify-center text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
          >
            {showMenu ? '✕' : '⚙️'}
          </button>
          
          {showMenu && (
              <div className="absolute top-12 left-0 bg-stone-800 border border-stone-700 rounded-xl p-2 shadow-xl w-48 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-xs font-bold text-stone-500 px-2 uppercase">Меню</h3>
                   <button onClick={onExit} className="text-left px-3 py-2 text-xs font-bold text-stone-300 hover:bg-red-900/50 hover:text-red-200 rounded-lg transition-colors flex items-center gap-2">
                    🏠 Головне Меню
                  </button>
                  <div className="h-px bg-stone-700 my-1" />
                  <button onClick={saveJSON} className="text-left px-3 py-2 text-xs font-bold text-amber-400 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-2">
                      💾 Зберегти JSON
                  </button>
                  <button onClick={saveSVG} className="text-left px-3 py-2 text-xs font-bold text-amber-400 hover:bg-stone-700 rounded-lg transition-colors flex items-center gap-2">
                      🖼️ Зберегти SVG
                  </button>
              </div>
          )}
      </div>
      
      <button onClick={saveJSON} className="absolute top-4 right-4 z-30 w-10 h-10 bg-stone-800/80 rounded-full border border-amber-500/30 flex items-center justify-center text-amber-400 hover:bg-stone-700 hover:scale-105 transition-all shadow-lg" title="Швидке збереження">
          💾
      </button>

      {/* Speed Slider at Bottom */}
      <div className="absolute bottom-6 left-0 right-0 px-8 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-full max-w-md bg-stone-800/90 backdrop-blur-sm p-4 rounded-xl border border-stone-700 shadow-xl pointer-events-auto">
                <div className="flex justify-between items-center mb-2">
                <label className="text-amber-500 text-xs font-bold uppercase tracking-wider">Швидкість</label>
                <span className="text-white font-mono text-sm">{speedPercent}%</span>
                </div>
                <input type="range" min="0" max="100" value={speedPercent} onChange={(e) => { /* Controlled via props in App.tsx */ }} 
                className="w-full h-2 bg-stone-600 rounded-lg appearance-none cursor-pointer accent-amber-500 touch-action-manipulation" 
                disabled
                title="Use slider in main view"
                />
          </div>
      </div>
    </div>
  );
};
