
import { MazeData } from '../types';

const CELL_SIZE = 40;

export const generateMazeSVG = (maze: MazeData): string => {
  const width = maze.width * CELL_SIZE;
  const height = maze.height * CELL_SIZE;

  let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1c1917" />
  <g stroke="#ef4444" stroke-width="3" stroke-linecap="square">`;

  // Draw Walls
  maze.grid.forEach(row => {
    row.forEach(cell => {
      const x = cell.x * CELL_SIZE;
      const y = cell.y * CELL_SIZE;

      if (cell.walls.top) svgContent += `<line x1="${x}" y1="${y}" x2="${x + CELL_SIZE}" y2="${y}" />`;
      if (cell.walls.right) svgContent += `<line x1="${x + CELL_SIZE}" y1="${y}" x2="${x + CELL_SIZE}" y2="${y + CELL_SIZE}" />`;
      if (cell.walls.bottom) svgContent += `<line x1="${x}" y1="${y + CELL_SIZE}" x2="${x + CELL_SIZE}" y2="${y + CELL_SIZE}" />`;
      if (cell.walls.left) svgContent += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + CELL_SIZE}" />`;
    });
  });
  svgContent += `</g>`;

  // Draw Bridges
  svgContent += `<g stroke="#3b82f6" stroke-width="3" stroke-dasharray="6,6">`;
  maze.grid.forEach(row => {
    row.forEach(cell => {
        if (cell.isBridge) {
            const x = cell.x * CELL_SIZE;
            const y = cell.y * CELL_SIZE;
            if (cell.bridgeDirection === 'horizontal') {
                svgContent += `<line x1="${x}" y1="${y+4}" x2="${x+CELL_SIZE}" y2="${y+4}" />`;
                svgContent += `<line x1="${x}" y1="${y+CELL_SIZE-4}" x2="${x+CELL_SIZE}" y2="${y+CELL_SIZE-4}" />`;
            } else if (cell.bridgeDirection === 'vertical') {
                svgContent += `<line x1="${x+4}" y1="${y}" x2="${x+4}" y2="${y+CELL_SIZE}" />`;
                svgContent += `<line x1="${x+CELL_SIZE-4}" y1="${y}" x2="${x+CELL_SIZE-4}" y2="${y+CELL_SIZE}" />`;
            }
        }
    });
  });
  svgContent += `</g>`;
  
  // Entrance/Exit Text
  if (maze.entrance) {
      const x = maze.entrance.x * CELL_SIZE + 5;
      const y = maze.entrance.y * CELL_SIZE + 25;
      svgContent += `<text x="${x}" y="${y}" fill="#16a34a" font-family="sans-serif" font-weight="bold" font-size="12">START</text>`;
  }
  if (maze.exit) {
      const x = maze.exit.x * CELL_SIZE + 10;
      const y = maze.exit.y * CELL_SIZE + 25;
      svgContent += `<text x="${x}" y="${y}" fill="#dc2626" font-family="sans-serif" font-weight="bold" font-size="12">EXIT</text>`;
  }

  svgContent += `</svg>`;
  
  // EMBED MAZE DATA FOR RESTORATION
  // We append the JSON data as a comment at the end of the SVG file
  svgContent += `\n<!-- MAZE_DATA_START ${JSON.stringify(maze)} MAZE_DATA_END -->`;
  
  return svgContent;
};

export const downloadFile = (content: string, filename: string, type: 'json' | 'svg') => {
  const mimeType = type === 'json' ? 'application/json' : 'image/svg+xml';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
