// ----------------------------------------------------
// APPLICATION GLOBAL CONFIGURATION & STATE
// ----------------------------------------------------

export const state = {
  currentTool: 'pen', // 'pen', 'select', 'pan', 'eraser', 'line', 'rectangle', 'circle', 'text', 'image'
  currentColor: '#ffffff',
  currentSize: 5,
  isDrawing: false,
  isPanning: false,
  gridEnabled: false,
  theme: 'green', // 'green', 'dark', 'light'
  selectedStroke: null,
  clipboard: null,
};

// Theme configurations defining backgrounds, grid lines, and soft chalky/bold marker presets
export const themesConfig = {
  green: {
    bg: '#172d24',
    bgSecondary: '#0e1e17',
    gridColor: 'rgba(255, 255, 255, 0.05)',
    presets: [
      { name: 'Chalk White', value: '#ffffff' },
      { name: 'Chalk Yellow', value: '#fff59d' },
      { name: 'Chalk Pink', value: '#ffab91' },
      { name: 'Chalk Blue', value: '#80deea' },
      { name: 'Chalk Green', value: '#c8e6c9' },
      { name: 'Chalk Orange', value: '#ffe082' },
      { name: 'Chalk Lilac', value: '#f8bbd0' }
    ],
    defaultColor: '#ffffff'
  },
  dark: {
    bg: '#1c1d21',
    bgSecondary: '#0f1013',
    gridColor: 'rgba(255, 255, 255, 0.04)',
    presets: [
      { name: 'Bright White', value: '#ffffff' },
      { name: 'Pastel Yellow', value: '#ffe082' },
      { name: 'Pastel Cyan', value: '#4dd0e1' },
      { name: 'Pastel Orange', value: '#ffb74d' },
      { name: 'Pastel Pink', value: '#ff8a80' },
      { name: 'Pastel Mint', value: '#a5d6a7' },
      { name: 'Pastel Purple', value: '#b39ddb' }
    ],
    defaultColor: '#ffffff'
  },
  light: {
    bg: '#f8fafc',
    bgSecondary: '#f1f5f9',
    gridColor: 'rgba(15, 23, 42, 0.04)',
    presets: [
      { name: 'Board Slate', value: '#0f172a' },
      { name: 'Marker Blue', value: '#2563eb' },
      { name: 'Marker Red', value: '#dc2626' },
      { name: 'Marker Green', value: '#16a34a' },
      { name: 'Marker Purple', value: '#9333ea' },
      { name: 'Marker Orange', value: '#ea580c' },
      { name: 'Marker Teal', value: '#0d9488' }
    ],
    defaultColor: '#0f172a'
  }
};
