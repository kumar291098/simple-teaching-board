// ----------------------------------------------------
// VECTOR STROKE HISTORY & UNDO-REDO STATE
// ----------------------------------------------------

// Array containing all active strokes. A stroke is:
// { tool: 'pen'|'eraser'|'line'|'rectangle'|'circle', color, size, points: [{x,y}, ...] }
export let strokes = [];

let undoStack = [];
let redoStack = [];
const maxHistory = 40;

// Listeners to update UI Undo/Redo buttons
let onHistoryChangeCallback = null;

export function registerHistoryListener(callback) {
  onHistoryChangeCallback = callback;
}

function notifyListener() {
  if (onHistoryChangeCallback) {
    onHistoryChangeCallback({
      canUndo: undoStack.length > 1,
      canRedo: redoStack.length > 0
    });
  }
}

// Push a deep copy of current strokes onto the undo history stack
export function saveHistoryState() {
  redoStack = [];
  undoStack.push(JSON.parse(JSON.stringify(strokes)));
  
  if (undoStack.length > maxHistory) {
    undoStack.shift();
  }
  
  notifyListener();
}

// Restore previous strokes state
export function undo() {
  if (undoStack.length <= 1) return;
  
  // Pop the active state and place it in the redo stack
  const currentState = undoStack.pop();
  redoStack.push(currentState);
  
  // Read the previous state
  const prevState = undoStack[undoStack.length - 1];
  strokes = JSON.parse(JSON.stringify(prevState));
  
  notifyListener();
}

// Restore popped states
export function redo() {
  if (redoStack.length === 0) return;
  
  const nextState = redoStack.pop();
  undoStack.push(nextState);
  strokes = JSON.parse(JSON.stringify(nextState));
  
  notifyListener();
}

// Add a completed stroke directly
export function addStroke(stroke) {
  strokes.push(stroke);
  saveHistoryState();
}

// Replace the active stroke list (e.g. during imports/restores)
export function setStrokes(newStrokes) {
  strokes = newStrokes;
}

// Initialize history with an empty slate
export function initHistory() {
  strokes = [];
  undoStack = [[]]; // Blank starting state
  redoStack = [];
  notifyListener();
}

// Clear all strokes
export function clearHistory() {
  strokes = [];
  saveHistoryState();
}
