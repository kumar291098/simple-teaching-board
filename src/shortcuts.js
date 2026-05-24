// ----------------------------------------------------
// KEYBOARD SHORTCUTS MANAGER & TEMPORARY MODES
// ----------------------------------------------------
import { state } from './config.js';
import { undo, redo, clearHistory } from './history.js';
import { exportCanvasAsImage } from './export.js';
import { resetView } from './camera.js';

let savedPrePanTool = 'pen';
let isSpacePanning = false;

// Register key event hooks
export function setupShortcuts(onToolChange, onThemeCycle, onGridToggle, triggerRedraw) {
  
  window.addEventListener('keydown', (e) => {
    // Skip shortcuts if focusing input or textarea elements (to allow typing text)
    if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.type !== 'range') return;
    
    const key = e.key.toLowerCase();
    
    // Spacebar Panning (temporary hold down space)
    if (e.code === 'Space' && !isSpacePanning) {
      e.preventDefault();
      isSpacePanning = true;
      
      // Save active tool and temporarily switch to pan tool
      if (state.currentTool !== 'pan') {
        savedPrePanTool = state.currentTool;
        onToolChange('pan');
      }
      return;
    }
    
    // Undo: Ctrl+Z
    if (e.ctrlKey && key === 'z') {
      e.preventDefault();
      undo();
      triggerRedraw();
      return;
    }
    
    // Redo: Ctrl+Y
    if (e.ctrlKey && key === 'y') {
      e.preventDefault();
      redo();
      triggerRedraw();
      return;
    }
    
    // Save: Ctrl+S
    if (e.ctrlKey && key === 's') {
      e.preventDefault();
      exportCanvasAsImage();
      return;
    }
    
    // View Resetter: Esc
    if (e.key === 'Escape') {
      e.preventDefault();
      resetView();
      triggerRedraw();
      
      // Update Zoom display text
      const zoomText = document.getElementById('zoomLevelText');
      if (zoomText) zoomText.textContent = '100%';
      return;
    }
    
    // Tool hotkeys
    switch (key) {
      case 'p':
        onToolChange('pen');
        break;
      case 'h':
        onToolChange('pan');
        break;
      case 'e':
        onToolChange('eraser');
        break;
      case 't':
        onToolChange('text');
        break;
      case 'i':
        document.getElementById('imageInput').click();
        break;
      case 'l':
        onToolChange('line');
        break;
      case 'r':
        onToolChange('rectangle');
        break;
      case 'c':
        onToolChange('circle');
        break;
      case 'g':
        onGridToggle();
        break;
      case 'b':
        onThemeCycle();
        break;
      case '?':
        const overlay = document.getElementById('shortcutsOverlay');
        if (overlay) overlay.classList.toggle('active');
        break;
      case 'delete':
      case 'backspace':
        if (confirm('Clear the active infinite teaching board?')) {
          clearHistory();
          triggerRedraw();
        }
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    // Release Spacebar Panning
    if (e.code === 'Space' && isSpacePanning) {
      e.preventDefault();
      isSpacePanning = false;
      
      // Restore previous tool
      onToolChange(savedPrePanTool);
    }
  });
}
