// ----------------------------------------------------
// THEME AND COLOR PALETTE COORDINATOR
// ----------------------------------------------------
import { state, themesConfig } from './config.js';

const colorPresetsContainer = document.getElementById('colorPresets');
const customColorPicker = document.getElementById('customColorPicker');
const btnTheme = document.getElementById('btn-theme');

// Apply the theme background styles and colors
export function setupTheme(themeName, onColorChange) {
  state.theme = themeName;
  
  // Set theme class on body
  document.body.className = '';
  document.body.classList.add(`board-theme-${themeName}`);
  
  // Update grid overlay if active
  updateGridStyle();
  
  // Generate palette color swatches
  generateColorPresets(themeName, onColorChange);
  
  // Apply theme-default draw color
  const config = themesConfig[themeName];
  onColorChange(config.defaultColor);
  
  // Update toggle button tooltip
  const themeTooltip = btnTheme.querySelector('.tooltip');
  if (themeTooltip) {
    const formattedName = themeName.charAt(0).toUpperCase() + themeName.slice(1);
    themeTooltip.textContent = `Board Style: ${formattedName}`;
  }
}

// Generate color swatches based on the theme's presets
function generateColorPresets(themeName, onColorChange) {
  colorPresetsContainer.innerHTML = '';
  const presets = themesConfig[themeName].presets;
  
  presets.forEach((preset) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = preset.value;
    swatch.title = preset.name;
    
    if (preset.value === state.currentColor) {
      swatch.classList.add('active');
    }
    
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      onColorChange(preset.value);
    });
    
    colorPresetsContainer.appendChild(swatch);
  });
}

// Update the grid overlay based on the theme colors
export function updateGridStyle() {
  const workspace = document.querySelector('.workspace');
  if (state.gridEnabled) {
    workspace.classList.add('show-grid');
    const theme = themesConfig[state.theme];
    
    workspace.style.backgroundImage = `
      radial-gradient(circle, ${theme.bg} 0%, ${theme.bgSecondary} 100%),
      linear-gradient(${theme.gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)
    `;
    workspace.style.backgroundSize = `
      100% 100%,
      40px 40px,
      40px 40px
    `;
  } else {
    workspace.classList.remove('show-grid');
    workspace.style.backgroundImage = '';
  }
}
