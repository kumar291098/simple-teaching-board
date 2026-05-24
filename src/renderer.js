// ----------------------------------------------------
// VECTOR CANVAS RENDERING ENGINE
// ----------------------------------------------------
import { state, themesConfig } from './config.js';
import { camera } from './camera.js';
import { strokes } from './history.js';

const paintCanvas = document.getElementById('paintCanvas');
const ctx = paintCanvas.getContext('2d');

// Image cache repository to optimize draw cycles
const imageCache = new Map();

export function getImageCached(dataURL) {
  if (imageCache.has(dataURL)) {
    return imageCache.get(dataURL);
  }
  const img = new Image();
  img.src = dataURL;
  img.onload = () => {
    window.dispatchEvent(new CustomEvent('image-loaded'));
  };
  imageCache.set(dataURL, img);
  return img;
}

let dpr = window.devicePixelRatio || 1;

// Initialize context size and properties
export function initRenderer() {
  const rect = paintCanvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  
  paintCanvas.width = rect.width * dpr;
  paintCanvas.height = rect.height * dpr;
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Clear the screen and draw the background grid + active history
export function draw(activeStroke = null) {
  // Clear screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  
  // 1. Draw Infinite Grid Lines (if toggled on)
  if (state.gridEnabled) {
    drawInfiniteGrid();
  }
  
  // 2. Apply Camera Pan & Zoom Transform for Vector Drawing
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Base DPI scale
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  
  // 3. Render Completed Strokes
  strokes.forEach(stroke => drawStroke(stroke));
  
  // 4. Render Active In-Progress Stroke (if drawing)
  if (activeStroke) {
    drawStroke(activeStroke);
  }
  
  ctx.restore();
}

// Draw a single stroke based on its tool path coordinates
function drawStroke(stroke) {
  if (!stroke.points || stroke.points.length === 0) return;
  
  ctx.save();
  
  // Apply tools attributes
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }
  
  const pts = stroke.points;
  
  if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      
      let i;
      for (i = 1; i < pts.length - 2; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      
      if (pts.length > 2) {
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      } else {
        ctx.lineTo(pts[1].x, pts[1].y);
      }
      ctx.stroke();
    }
  } 
  else if (stroke.tool === 'line') {
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
    }
  } 
  else if (stroke.tool === 'rectangle') {
    if (pts.length >= 2) {
      const width = pts[1].x - pts[0].x;
      const height = pts[1].y - pts[0].y;
      ctx.beginPath();
      ctx.strokeRect(pts[0].x, pts[0].y, width, height);
    }
  } 
  else if (stroke.tool === 'circle') {
    if (pts.length >= 2) {
      const radius = Math.sqrt(
        Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2)
      );
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  else if (stroke.tool === 'text') {
    if (pts.length >= 1 && stroke.text) {
      ctx.font = `500 ${stroke.size * 3}px var(--font-family-ui)`;
      ctx.fillStyle = stroke.color;
      ctx.textBaseline = 'top';
      ctx.fillText(stroke.text, pts[0].x, pts[0].y);
    }
  }
  else if (stroke.tool === 'image') {
    if (pts.length >= 2 && stroke.dataURL) {
      const img = getImageCached(stroke.dataURL);
      if (img && img.complete && img.naturalWidth > 0) {
        const x = pts[0].x;
        const y = pts[0].y;
        const w = pts[1].x - pts[0].x;
        const h = pts[1].y - pts[0].y;
        ctx.drawImage(img, x, y, w, h);
      }
    }
  }
  
  ctx.restore();
}

// Calculate viewport bounds in world coordinates to draw grid lines only where visible
function drawInfiniteGrid() {
  const rect = paintCanvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  
  // Calculate boundaries of the visible window in World space
  const left = (0 - camera.x) / camera.zoom;
  const top = (0 - camera.y) / camera.zoom;
  const right = (width - camera.x) / camera.zoom;
  const bottom = (height - camera.y) / camera.zoom;
  
  const theme = themesConfig[state.theme];
  
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Keep grid at screen resolution
  
  ctx.strokeStyle = theme.gridColor;
  ctx.lineWidth = 1;
  
  // Grid spacing defaults to 40 pixels, scaling slightly with zoom levels
  const baseSpacing = 40;
  const gridSize = baseSpacing; 
  
  // Align loops to grid boundaries
  const startX = Math.floor(left / gridSize) * gridSize;
  const endX = Math.ceil(right / gridSize) * gridSize;
  const startY = Math.floor(top / gridSize) * gridSize;
  const endY = Math.ceil(bottom / gridSize) * gridSize;
  
  // Draw vertical grid lines
  for (let x = startX; x <= endX; x += gridSize) {
    const screenPos = x * camera.zoom + camera.x;
    ctx.beginPath();
    ctx.moveTo(screenPos, 0);
    ctx.lineTo(screenPos, height);
    ctx.stroke();
  }
  
  // Draw horizontal grid lines
  for (let y = startY; y <= endY; y += gridSize) {
    const screenPos = y * camera.zoom + camera.y;
    ctx.beginPath();
    ctx.moveTo(0, screenPos);
    ctx.lineTo(width, screenPos);
    ctx.stroke();
  }
  
  ctx.restore();
}
