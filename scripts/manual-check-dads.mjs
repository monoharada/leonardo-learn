import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('Opening http://localhost:8081...');
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('\n=== Step 1: Click on Complementary harmony ===');
    await page.click('.dads-harmony-row:has-text("Complementary")');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: '/Users/reiharada/dev/leonardo-learn/scripts/step1-complementary-selected.png',
      fullPage: true
    });
    console.log('Screenshot saved: step1-complementary-selected.png');

    console.log('\n=== Step 2: Switch to Palette view ===');
    await page.click('#view-palette');
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: '/Users/reiharada/dev/leonardo-learn/scripts/step2-palette-view.png',
      fullPage: true
    });
    console.log('Screenshot saved: step2-palette-view.png');

    console.log('\n=== Step 3: Looking for harmony type selector ===');
    const selects = await page.evaluate(() => {
      const allSelects = Array.from(document.querySelectorAll('select'));
      return allSelects.map(select => ({
        id: select.id,
        name: select.name,
        className: select.className,
        value: select.value,
        options: Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }))
      }));
    });

    console.log('Found selects:');
    console.log(JSON.stringify(selects, null, 2));

    // Try to find DADS in any select
    let dadsFound = false;
    for (let i = 0; i < selects.length; i++) {
      const sel = selects[i];
      const dadsOption = sel.options.find(opt => opt.text.includes('DADS'));
      if (dadsOption) {
        console.log(`\nFound DADS in select #${i} (id: ${sel.id})`);
        console.log(`Selecting DADS (value: ${dadsOption.value})...`);

        await page.selectOption(`#${sel.id}`, dadsOption.value);
        await page.waitForTimeout(2000);

        dadsFound = true;
        break;
      }
    }

    if (dadsFound) {
      console.log('\n=== Step 4: DADS selected, taking screenshot ===');
      await page.screenshot({
        path: '/Users/reiharada/dev/leonardo-learn/scripts/step3-dads-selected.png',
        fullPage: true
      });
      console.log('Screenshot saved: step3-dads-selected.png');

      console.log('\n=== Step 5: Extracting semantic color data ===');
      const colorData = await page.evaluate(() => {
        const results = [];

        // Look for any elements that might contain color information
        const allElements = document.querySelectorAll('*');

        allElements.forEach(el => {
          const text = el.textContent?.trim();
          const attrs = {};

          // Collect all data attributes
          for (const attr of el.attributes) {
            if (attr.name.startsWith('data-')) {
              attrs[attr.name] = attr.value;
            }
          }

          // Check if element contains Success, Error, or Warning
          if (text && (text.includes('Success') || text.includes('Error') || text.includes('Warning') ||
                       text.includes('green-') || text.includes('red-'))) {
            results.push({
              text: text.substring(0, 50),
              className: el.className,
              attrs,
              bgColor: getComputedStyle(el).backgroundColor
            });
          }
        });

        return results;
      });

      console.log('\nColor data found:');
      console.log(JSON.stringify(colorData, null, 2));
    } else {
      console.log('\n❌ DADS option not found in any select element');
    }

    console.log('\n=== All screenshots saved ===');
    console.log('Check scripts/ directory for PNG files');
    console.log('\nBrowser will stay open. Press Ctrl+C to close.');

    // Keep browser open
    await page.waitForTimeout(300000); // 5 minutes

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({
      path: '/Users/reiharada/dev/leonardo-learn/scripts/error.png',
      fullPage: true
    });
  } finally {
    await browser.close();
  }
})();
