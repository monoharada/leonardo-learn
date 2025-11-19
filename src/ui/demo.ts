import { Color } from '../core/color';
import { BackgroundColor } from '../core/background';
import { Theme } from '../core/theme';
import { verifyContrast } from '../accessibility/wcag2';
import { getAPCA, getAPCAStatus } from '../accessibility/apca';
import { t, getWCAGLabel, getAPCALabel } from './i18n';

export const runDemo = () => {
  const app = document.getElementById('app');
  if (!app) return;

  // Initialize UI Text
  document.querySelector('h1')!.textContent = t.title;
  document.querySelector('label[for="keyColors"]')!.textContent = t.controls.keyColors;
  document.querySelector('label[for="ratios"]')!.textContent = t.controls.ratios;
  document.getElementById('regenerate')!.textContent = t.controls.regenerate;

  const render = () => {
    // 1. Get Inputs
    const keyColorsInput = (document.getElementById('keyColors') as HTMLInputElement).value;
    const ratiosInput = (document.getElementById('ratios') as HTMLInputElement).value;

    // 2. Parse Inputs
    let keyColors: Color[];
    try {
      keyColors = keyColorsInput.split(',').map(s => new Color(s.trim()));
    } catch (e) {
      alert('Invalid Color Format');
      return;
    }

    const ratios = ratiosInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    const bg = BackgroundColor.White; // Fixed for now, could be dynamic

    // 3. Generate Theme
    const theme = new Theme(keyColors, bg, ratios);
    const colors = theme.colors;

    // 4. Render
    app.innerHTML = '';
    colors.forEach((color, index) => {
      const hex = color.toHex();

      // Accessibility Checks
      const wcag = verifyContrast(color, bg);
      const apcaLc = getAPCA(color, bg);
      const apcaStatus = getAPCAStatus(apcaLc);

      const el = document.createElement('div');
      el.className = 'swatch';
      el.style.backgroundColor = hex;

      const white = new Color('#ffffff');
      const textCol = color.contrast(white) > 4.5 ? '#ffffff' : '#000000';
      el.style.color = textCol;

      el.innerHTML = `
        <div class="swatch-info">
          <div style="font-weight:bold;">${hex}</div>
          <div>${t.palette.target}: ${ratios[index]}</div>
        </div>
        <div style="text-align:right; font-size: 0.8rem;">
          <div class="contrast-badge" style="margin-bottom:4px;">
            ${t.accessibility.wcag2}: <strong>${wcag.contrast.toFixed(2)}:1</strong> (${getWCAGLabel(wcag.status)})
          </div>
          <div class="contrast-badge">
            ${t.accessibility.apca}: <strong>Lc ${apcaLc.toFixed(1)}</strong> (${getAPCALabel(apcaStatus)})
          </div>
        </div>
      `;
      app.appendChild(el);
    });
  };

  // Initial Render
  render();

  // Event Listeners
  document.getElementById('regenerate')?.addEventListener('click', render);
};
