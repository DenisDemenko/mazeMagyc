
import { Cell, MazeData, Direction, BridgeDirection, KeyItem, Barrier } from '../types';

class CellNode implements Cell {
  x: number;
  y: number;
  walls = { top: true, right: true, bottom: true, left: true };
  visited = false;
  isBridge = false;
  bridgeDirection: BridgeDirection = null;
  zone = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class MazeGenerator {
  width: number;
  height: number;
  grid: CellNode[][];
  bridges: Array<{ x: number; y: number; direction: BridgeDirection }> = [];
  keys: KeyItem[] = [];
  barriers: Barrier[] = [];
  entrance: { x: number; y: number; side: Direction } | null = null;
  exit: { x: number; y: number; side: Direction } | null = null;

  constructor(width = 15, height = 15) {
    this.width = width;
    this.height = height;
    this.grid = [];
    
    for (let y = 0; y < height; y++) {
      const row: CellNode[] = [];
      for (let x = 0; x < width; x++) {
        row.push(new CellNode(x, y));
      }
      this.grid.push(row);
    }
  }

  getCell(x: number, y: number): CellNode | null {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.grid[y][x];
    }
    return null;
  }

  getUnvisitedNeighbors(cell: CellNode): { cell: CellNode; direction: Direction }[] {
    const neighbors: { cell: CellNode; direction: Direction }[] = [];
    const directions: { dx: number; dy: number; dir: Direction }[] = [
      { dx: 0, dy: -1, dir: 'top' },
      { dx: 1, dy: 0, dir: 'right' },
      { dx: 0, dy: 1, dir: 'bottom' },
      { dx: -1, dy: 0, dir: 'left' },
    ];

    for (const { dx, dy, dir } of directions) {
      const neighbor = this.getCell(cell.x + dx, cell.y + dy);
      if (neighbor && !neighbor.visited) {
        neighbors.push({ cell: neighbor, direction: dir });
      }
    }
    return neighbors;
  }

  removeWall(current: CellNode, next: CellNode, direction: Direction) {
    const opposite: Record<Direction, Direction> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };

    current.walls[direction] = false;
    next.walls[opposite[direction]] = false;
  }

  generateBaseMaze() {
    const stack: CellNode[] = [];
    let current = this.grid[Math.floor(Math.random() * this.height)][Math.floor(Math.random() * this.width)];
    current.visited = true;
    let visitedCount = 1;
    const totalCells = this.width * this.height;

    while (visitedCount < totalCells) {
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        const { cell: next, direction } = neighbors[Math.floor(Math.random() * neighbors.length)];
        stack.push(current);
        this.removeWall(current, next, direction);
        current = next;
        current.visited = true;
        visitedCount++;
      } else if (stack.length > 0) {
        current = stack.pop()!;
      } else {
        break;
      }
    }
  }

  addEntranceAndExit() {
    const entranceCell = this.grid[0][0];
    entranceCell.walls['top'] = false;
    this.entrance = { x: 0, y: 0, side: 'top' };

    const exitCell = this.grid[this.height - 1][this.width - 1];
    exitCell.walls['bottom'] = false;
    this.exit = { x: this.width - 1, y: this.height - 1, side: 'bottom' };
  }

  findSuitableBridgeCells() {
    const suitable = [];
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const cell = this.grid[y][x];
        if (cell.isBridge) continue;

        if (cell.walls['left'] && cell.walls['right']) {
            suitable.push({ x, y, direction: 'horizontal' as BridgeDirection });
        }
        if (cell.walls['top'] && cell.walls['bottom']) {
            suitable.push({ x, y, direction: 'vertical' as BridgeDirection });
        }
      }
    }
    return suitable;
  }

  addBridges(numBridges = 3) {
    let added = 0;
    let attempts = 0;
    const maxAttempts = numBridges * 50;

    while (added < numBridges && attempts < maxAttempts) {
      attempts++;
      const suitable = this.findSuitableBridgeCells();
      if (suitable.length === 0) break;

      const candidateIndex = Math.floor(Math.random() * suitable.length);
      const candidate = suitable[candidateIndex];
      const cell = this.grid[candidate.y][candidate.x];
      
      if (candidate.direction === 'horizontal') {
         if (cell.walls['left'] && cell.walls['right']) {
            cell.isBridge = true;
            cell.bridgeDirection = 'horizontal';
            this.bridges.push({ x: candidate.x, y: candidate.y, direction: 'horizontal' });
            added++;
         }
      } else if (candidate.direction === 'vertical') {
         if (cell.walls['top'] && cell.walls['bottom']) {
            cell.isBridge = true;
            cell.bridgeDirection = 'vertical';
            this.bridges.push({ x: candidate.x, y: candidate.y, direction: 'vertical' });
            added++;
         }
      }
    }
    return added;
  }

  canTraverse(from: CellNode, to: CellNode, direction: 'top' | 'bottom' | 'left' | 'right'): boolean {
    if (!from.walls[direction]) return true;
    if (from.isBridge) {
        if (from.bridgeDirection === 'horizontal' && (direction === 'left' || direction === 'right')) return true;
        if (from.bridgeDirection === 'vertical' && (direction === 'top' || direction === 'bottom')) return true;
    }
    if (to.isBridge) {
        if (to.bridgeDirection === 'horizontal' && (direction === 'left' || direction === 'right')) return true;
        if (to.bridgeDirection === 'vertical' && (direction === 'top' || direction === 'bottom')) return true;
    }
    return false;
  }

  solveMaze(): CellNode[] | null {
    const start = this.grid[0][0];
    const end = this.grid[this.height - 1][this.width - 1];
    
    const queue: { cell: CellNode; path: CellNode[] }[] = [{ cell: start, path: [start] }];
    const visited = new Set<string>();
    visited.add(`0,0`);

    while (queue.length > 0) {
      const { cell, path } = queue.shift()!;

      if (cell === end) return path;

      const directions: { dx: number; dy: number; dir: 'top' | 'right' | 'bottom' | 'left' }[] = [
        { dx: 0, dy: -1, dir: 'top' },
        { dx: 1, dy: 0, dir: 'right' },
        { dx: 0, dy: 1, dir: 'bottom' },
        { dx: -1, dy: 0, dir: 'left' }
      ];

      for (const d of directions) {
        const nx = cell.x + d.dx;
        const ny = cell.y + d.dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
             const neighbor = this.grid[ny][nx];
             if (this.canTraverse(cell, neighbor, d.dir)) {
                 if (!visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({ cell: neighbor, path: [...path, neighbor] });
                 }
             }
        }
      }
    }
    return null;
  }

  severPath(numberOfCuts: number) {
    const path = this.solveMaze();
    if (!path || path.length < 10) return;
    
    const segmentSize = Math.floor(path.length / (numberOfCuts + 1));
    
    for (let i = 1; i <= numberOfCuts; i++) {
        let cutIndex = i * segmentSize;
        let attempts = 0;

        while (attempts < 10) {
            const cell = path[cutIndex];
            if (cell.isBridge || cutIndex < 2 || cutIndex > path.length - 3) {
                cutIndex++;
                if (cutIndex >= path.length - 2) cutIndex -= 5; 
            } else {
                break;
            }
            attempts++;
        }
        
        if (cutIndex < 2 || cutIndex >= path.length - 2) continue;

        const cellToSeal = path[cutIndex];
        if (cellToSeal.walls.top && cellToSeal.walls.bottom && cellToSeal.walls.left && cellToSeal.walls.right) continue;

        cellToSeal.walls.top = true;
        cellToSeal.walls.bottom = true;
        cellToSeal.walls.left = true;
        cellToSeal.walls.right = true;
        cellToSeal.isBridge = false;
        cellToSeal.bridgeDirection = null;

        const neighbors = [
          { dx: 0, dy: -1, wall: 'bottom' },
          { dx: 1, dy: 0, wall: 'left' },
          { dx: 0, dy: 1, wall: 'top' },
          { dx: -1, dy: 0, wall: 'right' }
        ];
        for (const n of neighbors) {
          const nx = cellToSeal.x + n.dx;
          const ny = cellToSeal.y + n.dy;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            const neighbor = this.grid[ny][nx];
            neighbor.walls[n.wall as keyof CellNode['walls']] = true;
          }
        }
    }
  }

  assignZones() {
    for(let y=0; y<this.height; y++) {
        for(let x=0; x<this.width; x++) {
            this.grid[y][x].zone = 0;
        }
    }

    let currentZoneId = 1;
    
    while(true) {
        let startCell: CellNode | null = null;
        
        if (currentZoneId === 1 && this.grid[0][0].zone === 0) {
             startCell = this.grid[0][0];
        } else {
             for(let y=0; y<this.height; y++) {
                for(let x=0; x<this.width; x++) {
                    if (this.grid[y][x].zone === 0) {
                        const w = this.grid[y][x].walls;
                        if (!w.top || !w.bottom || !w.left || !w.right) {
                             startCell = this.grid[y][x];
                             break;
                        }
                    }
                }
                if (startCell) break;
             }
        }
        
        if (!startCell) break; 

        const queue = [startCell];
        const visitedLocal = new Set<string>();
        visitedLocal.add(`${startCell.x},${startCell.y}`);
        startCell.zone = currentZoneId;

        while(queue.length > 0) {
            const cell = queue.shift()!;
            cell.zone = currentZoneId;
            
            const directions: { dx: number; dy: number; dir: 'top' | 'right' | 'bottom' | 'left' }[] = [
                { dx: 0, dy: -1, dir: 'top' },
                { dx: 1, dy: 0, dir: 'right' },
                { dx: 0, dy: 1, dir: 'bottom' },
                { dx: -1, dy: 0, dir: 'left' }
            ];

            for (const d of directions) {
                const nx = cell.x + d.dx;
                const ny = cell.y + d.dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    const neighbor = this.grid[ny][nx];
                    if (this.canTraverse(cell, neighbor, d.dir)) {
                        if (!visitedLocal.has(`${nx},${ny}`)) {
                            visitedLocal.add(`${nx},${ny}`);
                            if (neighbor.zone === 0) {
                                neighbor.zone = currentZoneId;
                                queue.push(neighbor);
                            }
                        }
                    }
                }
            }
        }
        
        currentZoneId++;
    }
  }

  addKeysAndBarriers(secretWords?: string[]) {
      const path = this.solveMaze();
      if (!path || path.length < 10) return;

      // Always place a barrier near the exit
      const exitIndex = path.length - 2;
      const barrierCell = path[exitIndex];

      if (!barrierCell.isBridge) {
          this.barriers.push({
              x: barrierCell.x,
              y: barrierCell.y,
              isOpen: false,
              type: 'master'
          });
      }

      // Find all reachable cells via BFS (excluding barrier and start)
      const queue = [this.grid[0][0]];
      const reachable = new Set<string>();
      reachable.add('0,0');
      const reachableCells: CellNode[] = [];

      while(queue.length > 0) {
          const cell = queue.shift()!;
          reachableCells.push(cell);
          const directions: { dx: number; dy: number; dir: 'top' | 'right' | 'bottom' | 'left' }[] = [
            { dx: 0, dy: -1, dir: 'top' }, { dx: 1, dy: 0, dir: 'right' },
            { dx: 0, dy: 1, dir: 'bottom' }, { dx: -1, dy: 0, dir: 'left' }
          ];
          for (const d of directions) {
            const nx = cell.x + d.dx;
            const ny = cell.y + d.dy;
            
            // Do not traverse through the barrier to find key spots
            if (nx === barrierCell.x && ny === barrierCell.y) continue;

            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                const neighbor = this.grid[ny][nx];
                if (this.canTraverse(cell, neighbor, d.dir)) {
                    if (!reachable.has(`${nx},${ny}`)) {
                        reachable.add(`${nx},${ny}`);
                        queue.push(neighbor);
                    }
                }
            }
        }
      }

      const validKeyCells = reachableCells.filter(c => !c.isBridge && !(c.x === 0 && c.y === 0));

      if (secretWords && secretWords.length > 0) {
          // LETTER HUNT MODE
          const allChars: string[] = [];
          secretWords.forEach(word => {
             allChars.push(...word.toUpperCase().split(''));
          });

          // Shuffle valid cells
          for (let i = validKeyCells.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [validKeyCells[i], validKeyCells[j]] = [validKeyCells[j], validKeyCells[i]];
          }

          // Assign characters to cells
          allChars.forEach((char, index) => {
              if (index < validKeyCells.length) {
                  const cell = validKeyCells[index];
                  this.keys.push({
                      x: cell.x,
                      y: cell.y,
                      collected: false,
                      type: 'master', // Part of the master lock
                      char: char
                  });
              }
          });

      } else {
          // LEGACY SINGLE KEY MODE
          if (validKeyCells.length > 0) {
              const keyCell = validKeyCells[Math.floor(Math.random() * validKeyCells.length)];
              this.keys.push({
                  x: keyCell.x,
                  y: keyCell.y,
                  collected: false,
                  type: 'master'
              });
              
              // Ensure key isn't walled in (simple heuristic)
              const neighbors = [
                { dx: 0, dy: -1, wall: 'top' }, { dx: 1, dy: 0, wall: 'right' },
                { dx: 0, dy: 1, wall: 'bottom' }, { dx: -1, dy: 0, wall: 'left' }
              ];
              neighbors.forEach(n => {
                  const nx = keyCell.x + n.dx;
                  const ny = keyCell.y + n.dy;
                  if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                      const neighbor = this.grid[ny][nx];
                      if (!neighbor.isBridge) {
                          this.removeWall(keyCell, neighbor, n.wall as Direction);
                      }
                  }
              });
          }
      }
  }

  generate(config: { enableTeleport: boolean; enableKeys: boolean; teleportPairs: number; secretWords?: string[] }) {
    this.generateBaseMaze();
    this.addEntranceAndExit();
    this.addBridges(Math.floor((this.width * this.height) * 0.08));
    
    if (config.enableKeys) {
        this.addKeysAndBarriers(config.secretWords); 
    }

    if (config.enableTeleport && config.teleportPairs > 0) {
        this.severPath(config.teleportPairs);
        this.assignZones();
    }
  }

  getData(): MazeData {
    return {
      width: this.width,
      height: this.height,
      grid: this.grid,
      bridges: this.bridges,
      keys: this.keys,
      barriers: this.barriers,
      entrance: this.entrance,
      exit: this.exit
    };
  }
}
