import { Color } from '../core/color';
import { BackgroundColor } from '../core/background';
import { Theme } from '../core/theme';

export const runDemo = () => {
    const app = document.getElementById('app');
    if (!app) return;

    // 1. Define Key Colors (Black -> White)
    const keyColors = [new Color('#000000'), new Color('#ffffff')];
    const bg = BackgroundColor.White;

    // 2. Define Target Ratios
    // We want a full scale from Black (21:1) to White (1:1)
    const ratios = [21, 15, 10, 7, 4.5, 3, 1];

    // 3. Generate Theme
    const theme = new Theme(keyColors, bg, ratios);
    const colors = theme.colors;

    // 4. Render
    app.innerHTML = '';
    colors.forEach((color, index) => {
        const contrast = color.contrast(bg);
        const hex = color.toHex();
        const el = document.createElement('div');
        el.className = 'swatch';
        el.style.backgroundColor = hex;

        // Determine text color based on contrast for readability of the label itself
        // Simple logic: if contrast with white < 4.5, use black text, else white (if bg is white)
        // Actually, we are rendering ON the color.
        // So we need to check contrast of Text(White/Black) vs Color.
        const white = new Color('#ffffff');
        const textCol = color.contrast(white) > 4.5 ? '#ffffff' : '#000000';
        el.style.color = textCol;

        el.innerHTML = `
      <div class="swatch-info">
        <span>${hex}</span>
        <span>Target: ${ratios[index]}</span>
      </div>
      <div class="contrast-badge">
        ${contrast.toFixed(2)}:1
      </div>
    `;
        app.appendChild(el);
    });
};
