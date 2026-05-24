// ----------------------------------------------------
// CAMERA (PAN & ZOOM) STATE AND CONTROLS
// ----------------------------------------------------

export const camera = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.15,
  maxZoom: 8.0,
};

// Convert Screen coordinates to World Coordinates on the infinite canvas
export function screenToWorld(screenX, screenY) {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
}

// Convert World coordinates to Screen coordinates
export function worldToScreen(worldX, worldY) {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  };
}

// Apply panning offset
export function pan(dx, dy) {
  camera.x += dx;
  camera.y += dy;
}

// Zoom in/out, anchoring the zoom origin to the cursor's screen point
export function zoomAt(screenX, screenY, factor) {
  const previousZoom = camera.zoom;
  let newZoom = previousZoom * factor;
  
  // Clamp zoom levels
  newZoom = Math.min(Math.max(newZoom, camera.minZoom), camera.maxZoom);
  if (newZoom === previousZoom) return;

  // Transform cursor position into world coordinates
  const worldX = (screenX - camera.x) / previousZoom;
  const worldY = (screenY - camera.y) / previousZoom;

  // Update zoom level
  camera.zoom = newZoom;

  // Move camera so that the world coordinate remains in the same screen spot
  camera.x = screenX - worldX * newZoom;
  camera.y = screenY - worldY * newZoom;
}

// Reset view back to center (0,0) and scale 1:1
export function resetView() {
  camera.x = 0;
  camera.y = 0;
  camera.zoom = 1.0;
}
