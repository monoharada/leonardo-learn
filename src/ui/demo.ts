import { Color } from '../core/color';
import { BackgroundColor } from '../core/background';
import { Theme } from '../core/theme';
import { verifyContrast } from '../accessibility/wcag2';
import { getAPCA, getAPCAStatus } from '../accessibility/apca';

export const runDemo = () => {
  const app = document.getElementById('app');
  if (!app) return;

  // 1. Define Key Colors (Black -> White)
  const keyColors = [new Color('#000000'), new Color('#ffffff')];
  const bg = BackgroundColor.White;

  // 2. Define Target Ratios
  const ratios = [21, 15, 10, 7, 4.5, 3, 1];

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
        <div>Target: ${ratios[index]}</div>
      </div>
      <div style="text-align:right; font-size: 0.8rem;">
        <div class="contrast-badge" style="margin-bottom:4px;">
          WCAG 2.1: <strong>${wcag.contrast.toFixed(2)}:1</strong> (${wcag.status})
        </div>
        <div class="contrast-badge">
          APCA: <strong>Lc ${apcaLc.toFixed(1)}</strong> (${apcaStatus})
        </div>
      </div>
    `;
    app.appendChild(el);
  });
};
