// ----------------------------------------------------
// EXPORT CANVAS TO PNG COMPILER
// ----------------------------------------------------
import { state, themesConfig } from './config.js';
import { camera } from './camera.js';
import { strokes } from './history.js';
import { getImageCached } from './renderer.js';

const paintCanvas = document.getElementById('paintCanvas');

export function exportCanvasAsImage() {
  const theme = themesConfig[state.theme];
  const dpr = window.devicePixelRatio || 1;
  
  // Create a temporary canvas matching the raw pixel resolution of the active paint canvas
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = paintCanvas.width;
  exportCanvas.height = paintCanvas.height;
  const exportCtx = exportCanvas.getContext('2d');
  
  const width = paintCanvas.width / dpr;
  const height = paintCanvas.height / dpr;
  
  // 1. Draw Chalkboard / Whiteboard Background Theme
  if (state.theme === 'light') {
    exportCtx.fillStyle = theme.bg;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  } else {
    // Beautiful radial chalkboard background gradient
    const gradient = exportCtx.createRadialGradient(
      exportCanvas.width / 2, exportCanvas.height / 2, 0,
      exportCanvas.width / 2, exportCanvas.height / 2, Math.max(exportCanvas.width, exportCanvas.height) * 0.8
    );
    gradient.addColorStop(0, theme.bg);
    gradient.addColorStop(1, theme.bgSecondary);
    exportCtx.fillStyle = gradient;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }
  
  // 2. Draw Grid Lines (if toggled on) matching current viewport zoom/pan offsets
  if (state.gridEnabled) {
    exportCtx.strokeStyle = theme.gridColor;
    exportCtx.lineWidth = 1 * dpr;
    
    // Bounds of screen in World space
    const left = (0 - camera.x) / camera.zoom;
    const top = (0 - camera.y) / camera.zoom;
    const right = (width - camera.x) / camera.zoom;
    const bottom = (height - camera.y) / camera.zoom;
    
    const gridSize = 40;
    
    const startX = Math.floor(left / gridSize) * gridSize;
    const endX = Math.ceil(right / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;
    const endY = Math.ceil(bottom / gridSize) * gridSize;
    
    // Vertical grid lines
    for (let x = startX; x <= endX; x += gridSize) {
      const screenPos = (x * camera.zoom + camera.x) * dpr;
      exportCtx.beginPath();
      exportCtx.moveTo(screenPos, 0);
      exportCtx.lineTo(screenPos, exportCanvas.height);
      exportCtx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
      const screenPos = (y * camera.zoom + camera.y) * dpr;
      exportCtx.beginPath();
      exportCtx.moveTo(0, screenPos);
      exportCtx.lineTo(exportCanvas.width, screenPos);
      exportCtx.stroke();
    }
  }
  
  // 3. Draw Vector History Strokes (offset by camera zoom/pan)
  exportCtx.save();
  exportCtx.scale(dpr, dpr);
  exportCtx.translate(camera.x, camera.y);
  exportCtx.scale(camera.zoom, camera.zoom);
  
  exportCtx.lineCap = 'round';
  exportCtx.lineJoin = 'round';
  
  strokes.forEach(stroke => {
    if (!stroke.points || stroke.points.length === 0) return;
    
    exportCtx.save();
    
    exportCtx.strokeStyle = stroke.color;
    exportCtx.fillStyle = stroke.color;
    exportCtx.lineWidth = stroke.size;
    
    if (stroke.tool === 'eraser') {
      // In export, eraser cuts holes to reveal the compiled background theme color
      // Since background is drawn first, we can use destination-out to erase drawings
      exportCtx.globalCompositeOperation = 'destination-out';
    } else {
      exportCtx.globalCompositeOperation = 'source-over';
    }
    
    const pts = stroke.points;
    
    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      if (pts.length === 1) {
        exportCtx.beginPath();
        exportCtx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
        exportCtx.fill();
      } else {
        exportCtx.beginPath();
        exportCtx.moveTo(pts[0].x, pts[0].y);
        
        let i;
        for (i = 1; i < pts.length - 2; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          exportCtx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        
        if (pts.length > 2) {
          exportCtx.quadraticCurveTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        } else {
          exportCtx.lineTo(pts[1].x, pts[1].y);
        }
        exportCtx.stroke();
      }
    } 
    else if (stroke.tool === 'line') {
      if (pts.length >= 2) {
        exportCtx.beginPath();
        exportCtx.moveTo(pts[0].x, pts[0].y);
        exportCtx.lineTo(pts[1].x, pts[1].y);
        exportCtx.stroke();
      }
    } 
    else if (stroke.tool === 'rectangle') {
      if (pts.length >= 2) {
        const w = pts[1].x - pts[0].x;
        const h = pts[1].y - pts[0].y;
        exportCtx.beginPath();
        exportCtx.strokeRect(pts[0].x, pts[0].y, w, h);
      }
    } 
    else if (stroke.tool === 'circle') {
      if (pts.length >= 2) {
        const radius = Math.sqrt(
          Math.pow(pts[1].x - pts[0].x, 2) + Math.pow(pts[1].y - pts[0].y, 2)
        );
        exportCtx.beginPath();
        exportCtx.arc(pts[0].x, pts[0].y, radius, 0, Math.PI * 2);
        exportCtx.stroke();
      }
    }
    else if (stroke.tool === 'text') {
      if (pts.length >= 1 && stroke.text) {
        exportCtx.font = `500 ${stroke.size * 3}px var(--font-family-ui)`;
        exportCtx.fillStyle = stroke.color;
        exportCtx.textBaseline = 'top';
        exportCtx.fillText(stroke.text, pts[0].x, pts[0].y);
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
          exportCtx.drawImage(img, x, y, w, h);
        }
      }
    }
    
    exportCtx.restore();
  });
  
  exportCtx.restore();
  
  // 4. Download file
  try {
    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    
    const date = new Date();
    const dateString = date.toISOString().slice(0, 10);
    const timeString = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    
    link.download = `coding-help-infinite-board_${dateString}_${timeString}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export canvas:', err);
    alert('Oops! Canvas export failed. Please check developer tools for detail.');
  }
}
