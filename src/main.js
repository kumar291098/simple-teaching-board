// ----------------------------------------------------
// APPLICATION CORE ENTRY POINT & ROUTER
// ----------------------------------------------------
import { state, themesConfig } from './config.js';
import { camera, screenToWorld, pan, zoomAt, resetView } from './camera.js';
import { initHistory, addStroke, registerHistoryListener, undo, redo, clearHistory } from './history.js';
import { setupTheme, updateGridStyle } from './theme.js';
import { initRenderer, draw } from './renderer.js';
import { setupShortcuts } from './shortcuts.js';
import { exportCanvasAsImage } from './export.js';

// DOM Selectors
const paintCanvas = document.getElementById('paintCanvas');
const splash = document.getElementById('splash');
const brushSizeInput = document.getElementById('brushSize');
const brushSizeVal = document.getElementById('brushSizeVal');
const brushPreviewDot = document.getElementById('brushPreviewDot');
const customColorPicker = document.getElementById('customColorPicker');
const eraserCursor = document.getElementById('eraserCursor');
const sidebar = document.getElementById('sidebar');
const imageInput = document.getElementById('imageInput');

// Keyboard Shortcuts Elements
const shortcutsOverlay = document.getElementById('shortcutsOverlay');
const btnShortcuts = document.getElementById('btn-shortcuts');
const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');

// Zoom DOM indicators
const zoomLevelText = document.getElementById('zoomLevelText');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');

// Action Buttons
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');
const btnClear = document.getElementById('btn-clear');
const btnGrid = document.getElementById('btn-grid');
const btnTheme = document.getElementById('btn-theme');
const btnDownload = document.getElementById('btn-download');

// Active local states
let activeStroke = null;
let lastPointerPos = { x: 0, y: 0 };
let savedColorPreEraser = '#ffffff';

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initRenderer();
  initHistory();
  
  // Connect history state updates to toolbar undo/redo buttons
  registerHistoryListener(({ canUndo, canRedo }) => {
    btnUndo.disabled = !canUndo;
    btnRedo.disabled = !canRedo;
  });
  
  // Set default blackboard theme & load palette presets
  setupTheme(state.theme, (color) => {
    state.currentColor = color;
    customColorPicker.value = color;
    updateBrushPreview();
  });
  
  setupDOMListeners();
  
  // Initialize keyboard shortcut handlers
  setupShortcuts(
    (tool) => switchTool(tool),
    () => cycleTheme(),
    () => toggleGrid(),
    () => draw()
  );
  
  // Slide out loading splash screen
  setTimeout(() => {
    splash.classList.add('splash-fadeout');
    draw();
  }, 1900);
});

// ----------------------------------------------------
// INTERACTIONS ROUTING (DRAWING & PANNING)
// ----------------------------------------------------
function setupDOMListeners() {
  window.addEventListener('resize', handleResize);
  
  // Pointer Drawing / Panning
  paintCanvas.addEventListener('pointerdown', handlePointerDown);
  paintCanvas.addEventListener('pointermove', handlePointerMove);
  paintCanvas.addEventListener('pointerup', handlePointerUp);
  paintCanvas.addEventListener('pointercancel', handlePointerUp);
  
  // Zoom on wheel (Ctrl+Wheel to zoom, standard Wheel also zooms for simplicity)
  paintCanvas.addEventListener('wheel', handleWheel, { passive: false });
  
  // Image loader updates and Drag & Drop file receivers
  window.addEventListener('image-loaded', () => draw());
  imageInput.addEventListener('change', handleImageUpload);
  paintCanvas.addEventListener('dragover', (e) => e.preventDefault());
  paintCanvas.addEventListener('drop', handleImageDrop);
  
  // Eraser hover cursor display
  paintCanvas.addEventListener('pointerenter', () => {
    if (state.currentTool === 'eraser') eraserCursor.style.display = 'block';
  });
  paintCanvas.addEventListener('pointerleave', () => {
    eraserCursor.style.display = 'none';
  });
  
  // Tool buttons binding
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTool(e.currentTarget.getAttribute('data-tool'));
    });
  });
  
  // Image Upload Button Trigger
  document.getElementById('tool-image').addEventListener('click', () => {
    imageInput.click();
  });
  
  // Brush controls
  brushSizeInput.addEventListener('input', (e) => {
    state.currentSize = parseInt(e.target.value);
    brushSizeVal.textContent = `${state.currentSize}px`;
    updateBrushPreview();
  });
  
  customColorPicker.addEventListener('input', (e) => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    state.currentColor = e.target.value;
    updateBrushPreview();
  });
  
  // Zoom Actions
  btnZoomIn.addEventListener('click', () => triggerButtonZoom(1.2));
  btnZoomOut.addEventListener('click', () => triggerButtonZoom(0.8));
  zoomLevelText.addEventListener('dblclick', triggerZoomReset);
  
  // Command actions
  btnUndo.addEventListener('click', () => { undo(); draw(); });
  btnRedo.addEventListener('click', () => { redo(); draw(); });
  btnClear.addEventListener('click', () => {
    if (confirm('Clear the active infinite teaching board?')) {
      clearHistory();
      draw();
    }
  });
  btnGrid.addEventListener('click', toggleGrid);
  btnTheme.addEventListener('click', cycleTheme);
  btnDownload.addEventListener('click', exportCanvasAsImage);
  
  // Settings collapsible toggles (bottom horizontal bar)
  const toggleSettings = () => sidebar.classList.toggle('collapsed');
  document.getElementById('btn-toggle-settings-left').addEventListener('click', toggleSettings);
  document.getElementById('btn-toggle-settings-right').addEventListener('click', toggleSettings);

  // Toolbar collapsible toggles (top horizontal toolbar)
  const mainToolbar = document.getElementById('mainToolbar');
  const toggleToolbar = () => mainToolbar.classList.toggle('collapsed');
  document.getElementById('btn-toggle-toolbar-left').addEventListener('click', toggleToolbar);
  document.getElementById('btn-toggle-toolbar-right').addEventListener('click', toggleToolbar);

  // Shortcuts overlay toggle actions
  const toggleShortcuts = () => shortcutsOverlay.classList.toggle('active');
  btnShortcuts.addEventListener('click', toggleShortcuts);
  btnCloseShortcuts.addEventListener('click', toggleShortcuts);
  
  // Close shortcuts on clicking outside modal
  shortcutsOverlay.addEventListener('click', (e) => {
    if (e.target === shortcutsOverlay) {
      shortcutsOverlay.classList.remove('active');
    }
  });
}

// ----------------------------------------------------
// EVENT HANDLERS
// ----------------------------------------------------
function handlePointerDown(e) {
  const rect = paintCanvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  // Spacebar pan mode or Middle mouse click or Right click triggers panning
  if (state.currentTool === 'pan' || e.button === 1 || e.button === 2) {
    state.isPanning = true;
    lastPointerPos = { x: e.clientX, y: e.clientY };
    paintCanvas.setPointerCapture(e.pointerId);
    return;
  }
  
  // Text Tool handler - places floating overlay input
  if (state.currentTool === 'text') {
    createTextOverlay(e.clientX, e.clientY);
    return;
  }
  
  state.isDrawing = true;
  
  // Translate pointer down to world space coordinates
  const worldPos = screenToWorld(screenX, screenY);
  
  // Start new active vector stroke
  activeStroke = {
    tool: state.currentTool,
    color: state.currentTool === 'eraser' ? 'transparent' : state.currentColor,
    size: state.currentSize,
    points: [worldPos]
  };
  
  // Update eraser cursor positions
  if (state.currentTool === 'eraser') {
    eraserCursor.style.left = `${e.clientX}px`;
    eraserCursor.style.top = `${e.clientY}px`;
  }
  
  draw(activeStroke);
}

function handlePointerMove(e) {
  // Update eraser cursor size circle position on hover
  if (state.currentTool === 'eraser') {
    eraserCursor.style.left = `${e.clientX}px`;
    eraserCursor.style.top = `${e.clientY}px`;
    eraserCursor.style.width = `${state.currentSize * camera.zoom}px`;
    eraserCursor.style.height = `${state.currentSize * camera.zoom}px`;
  }
  
  if (state.isPanning) {
    const dx = e.clientX - lastPointerPos.x;
    const dy = e.clientY - lastPointerPos.y;
    pan(dx, dy);
    lastPointerPos = { x: e.clientX, y: e.clientY };
    draw();
    return;
  }
  
  if (!state.isDrawing || !activeStroke) return;
  
  const rect = paintCanvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  const worldPos = screenToWorld(screenX, screenY);
  
  if (activeStroke.tool === 'pen' || activeStroke.tool === 'eraser') {
    activeStroke.points.push(worldPos);
  } else {
    // Shape previews hold [startPoint, currentDragPoint]
    activeStroke.points[1] = worldPos;
  }
  
  draw(activeStroke);
}

function handlePointerUp(e) {
  if (state.isPanning) {
    state.isPanning = false;
    paintCanvas.releasePointerCapture(e.pointerId);
    return;
  }
  
  if (state.isDrawing && activeStroke) {
    state.isDrawing = false;
    
    // Discard single-pixel eraser clicks if desired, otherwise add stroke to history
    if (activeStroke.points.length > 0) {
      addStroke(activeStroke);
    }
    
    activeStroke = null;
    draw();
  }
}

// ----------------------------------------------------
// SCROLL / PINCH ZOOM HANDLER
// ----------------------------------------------------
function handleWheel(e) {
  e.preventDefault();
  
  const rect = paintCanvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  // Zoom speed modifier
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  
  zoomAt(screenX, screenY, zoomFactor);
  updateZoomDisplay();
  draw();
}

function triggerButtonZoom(factor) {
  const rect = paintCanvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  zoomAt(centerX, centerY, factor);
  updateZoomDisplay();
  draw();
}

function triggerZoomReset() {
  resetView();
  updateZoomDisplay();
  draw();
}

function updateZoomDisplay() {
  zoomLevelText.textContent = `${Math.round(camera.zoom * 100)}%`;
}

// ----------------------------------------------------
// UI AUXILIARY HELPERS
// ----------------------------------------------------
function switchTool(toolName) {
  state.currentTool = toolName;
  
  // Update active state in toolbar buttons
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tool') === toolName);
  });
  
  // Canvas cursor adjustments
  paintCanvas.className = '';
  if (toolName === 'pan') {
    paintCanvas.classList.add('drawing-active-pan');
    eraserCursor.style.display = 'none';
  } else if (toolName === 'text') {
    paintCanvas.classList.add('drawing-active-text');
    eraserCursor.style.display = 'none';
  } else if (toolName === 'eraser') {
    paintCanvas.classList.add('drawing-active-pen');
    eraserCursor.style.display = 'block';
  } else if (toolName === 'pen') {
    paintCanvas.classList.add('drawing-active-pen');
    eraserCursor.style.display = 'none';
  } else {
    paintCanvas.classList.add('drawing-active-shapes');
    eraserCursor.style.display = 'none';
  }
  
  updateBrushPreview();
}

function updateBrushPreview() {
  brushPreviewDot.style.width = `${state.currentSize}px`;
  brushPreviewDot.style.height = `${state.currentSize}px`;
  
  if (state.currentTool === 'eraser') {
    brushPreviewDot.style.backgroundColor = 'transparent';
    brushPreviewDot.style.border = '2px solid #ef4444';
  } else {
    brushPreviewDot.style.backgroundColor = state.currentColor;
    brushPreviewDot.style.border = 'none';
  }
}

function handleResize() {
  initRenderer();
  draw();
}

function toggleGrid() {
  state.gridEnabled = !state.gridEnabled;
  btnGrid.classList.toggle('active', state.gridEnabled);
  updateGridStyle();
  draw();
}

function cycleTheme() {
  const themes = Object.keys(themesConfig);
  const nextIdx = (themes.indexOf(state.theme) + 1) % themes.length;
  
  setupTheme(themes[nextIdx], (color) => {
    state.currentColor = color;
    customColorPicker.value = color;
    updateBrushPreview();
  });
  
  draw();
}

// ----------------------------------------------------
// FLOATING TEXT OVERLAY LOGIC
// ----------------------------------------------------
let activeTextOverlay = null;

function createTextOverlay(clientX, clientY) {
  // Clear any existing active overlay first
  if (activeTextOverlay) {
    activeTextOverlay.blur();
  }
  
  const rect = paintCanvas.getBoundingClientRect();
  
  const textarea = document.createElement('textarea');
  textarea.className = 'floating-text-input';
  textarea.style.left = `${clientX}px`;
  textarea.style.top = `${clientY}px`;
  
  // Font size matches brush size scaled by zoom level
  const fontSize = state.currentSize * 3;
  textarea.style.fontSize = `${fontSize * camera.zoom}px`;
  textarea.style.color = state.currentColor;
  
  document.body.appendChild(textarea);
  activeTextOverlay = textarea;
  
  // Focus and adjust height dynamically
  setTimeout(() => textarea.focus(), 10);
  
  let isFinishing = false;
  
  function finishTextOverlay() {
    if (isFinishing) return;
    isFinishing = true;
    
    const text = textarea.value.trim();
    if (text) {
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const worldPos = screenToWorld(x, y);
      
      addStroke({
        tool: 'text',
        text: text,
        points: [worldPos],
        color: state.currentColor,
        size: state.currentSize
      });
    }
    
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
    
    activeTextOverlay = null;
    draw();
  }
  
  textarea.addEventListener('blur', finishTextOverlay);
  
  textarea.addEventListener('keydown', (event) => {
    // Enter key (without shift) completes the text box
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      textarea.blur(); // Triggers blur/finishTextOverlay
    }
    // Escape discards
    if (event.key === 'Escape') {
      isFinishing = true;
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
      activeTextOverlay = null;
      draw();
    }
  });
}

// ----------------------------------------------------
// IMAGE LOAD & DRAG-AND-DROP LOGIC
// ----------------------------------------------------
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      loadAndPlaceImage(event.target.result);
    };
    reader.readAsDataURL(file);
  }
  e.target.value = ''; // Reset
}

function handleImageDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      loadAndPlaceImage(event.target.result);
    };
    reader.readAsDataURL(file);
  }
}

function loadAndPlaceImage(dataURL) {
  const img = new Image();
  img.src = dataURL;
  img.onload = () => {
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    
    // Scale image down if it exceeds maximum world size bounds
    const maxWorldDim = 320;
    if (w > maxWorldDim || h > maxWorldDim) {
      const ratio = Math.min(maxWorldDim / w, maxWorldDim / h);
      w = w * ratio;
      h = h * ratio;
    }
    
    // Calculate world center of current viewport camera
    const rect = paintCanvas.getBoundingClientRect();
    const centerX = (rect.width / 2 - camera.x) / camera.zoom;
    const centerY = (rect.height / 2 - camera.y) / camera.zoom;
    
    const x1 = centerX - w / 2;
    const y1 = centerY - h / 2;
    const x2 = centerX + w / 2;
    const y2 = centerY + h / 2;
    
    addStroke({
      tool: 'image',
      dataURL: dataURL,
      points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
      size: 1,
      color: 'transparent'
    });
    
    draw();
  };
}
