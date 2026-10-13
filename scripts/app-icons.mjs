// Draws the app's icons from the brand's isotype — the `a` mark alone, no
// BLOOM over it: at launcher size the word was a blur. The splash screen keeps
// the full lockup (assets/images/splash-icon.png, not drawn here).
//
// One icon per build, coloured as the web's favicon is per environment
// (bloomboard-frontend public/favicon*.svg): production the brand's blue, beta
// amber, development green — so a phone with two builds tells them apart.
// app.config.ts picks the files by APP_ENV.
//
//   assets/images/icon[-beta|-dev].png                     1024², iOS + legacy
//   assets/images/android-icon-background[-beta|-dev].png  adaptive background
//   assets/images/android-icon-foreground.png              adaptive mark (white)
//   assets/images/android-icon-monochrome.png              themed-icon mark
//   assets/images/notification-icon.png                    status-bar mark
//   store/google-play/graphics/icon-512.png                the Play listing's
//
// SVG is rendered with Chromium through Playwright, which is not a dependency
// of this repo — point PLAYWRIGHT at any installed copy's index.js:
//
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.js node scripts/app-icons.mjs

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const images = join(root, 'assets', 'images');

// The isotype, path for path the one in src/shared/ui/BrandLogo.tsx.
const MARK = { w: 1235.7, h: 589.84 };
const MARK_PATH =
  'M1207.16,459.03c-33.3,0-45.19-11.9-45.19-45.2l-.66-133.41-.29-.16C1154.8,125.11,1026,.1,869.39.08l-215.56-.03L291.96,0C131.4-.02.02,131.33,0,291.88h0c-.02,160.56,131.33,291.94,291.88,291.96l478.01.06c6.49.39,13.09.59,19.81.59,7.84,0,15.4-.2,22.68-.59,107.59-5.75,155.9-53.8,193.78-137.33h7.14c0,37.09,7.8,79.68,22.34,99.77,22.29,30.81,60.45,43.48,110.84,43.49,39.25,0,64.22-3.56,89.2-8.31l.02-122.49h-28.55ZM1009.76,314.07c-4.64,29.35-18.48,56.55-40.15,78.21-27.02,27.01-62.63,41.88-100.28,41.87l-120.4-.02-162.34-.02-294.69-.04c-37.65,0-73.26-14.89-100.27-41.9-27.01-27.02-41.88-62.63-41.87-100.28,0-37.65,14.89-73.26,41.9-100.26,27.02-27.01,62.63-41.88,100.28-41.87l577.43.08c37.65,0,73.26,14.89,100.27,41.9,2.79,2.79,5.42,5.69,7.94,8.66,21.95,25.76,33.94,57.86,33.93,91.62,0,7.45-.61,14.81-1.75,22.05Z';

/** Top-left to bottom-right, as the brand's app tile. */
const VARIANTS = {
  '': { from: '#1345a8', to: '#020c1c' }, // production
  '-beta': { from: '#b45309', to: '#451a03' },
  '-dev': { from: '#15803d', to: '#052e16' },
};

const SIZE = 1024;
// The mark's width: on the full icon, and inside the adaptive icon's safe
// circle (66 of 108 dp ≈ 626 px of 1024 — a 2.1:1 mark fits at ≤ 565; 470
// leaves it the breathing room the full icon has).
const ICON_MARK = 620;
const ADAPTIVE_MARK = 470;

const mark = (width) => {
  const scale = width / MARK.w;
  const x = (SIZE - width) / 2;
  const y = (SIZE - MARK.h * scale) / 2;
  return `<path transform="translate(${x} ${y}) scale(${scale})" fill="#ffffff" d="${MARK_PATH}"/>`;
};

const background = ({ from, to }) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
  `</linearGradient></defs><rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;

const outputs = [
  ...Object.entries(VARIANTS).flatMap(([suffix, colors]) => [
    {
      file: join(images, `icon${suffix}.png`),
      svg: svg(background(colors) + mark(ICON_MARK)),
    },
    {
      file: join(images, `android-icon-background${suffix}.png`),
      svg: svg(background(colors)),
    },
  ]),
  {
    file: join(images, 'android-icon-foreground.png'),
    svg: svg(mark(ADAPTIVE_MARK)),
  },
  {
    file: join(images, 'android-icon-monochrome.png'),
    svg: svg(mark(ADAPTIVE_MARK)),
  },
  // Android's status-bar icon is a white silhouette; 96 px is its xxxhdpi.
  {
    file: join(images, 'notification-icon.png'),
    svg: svg(mark(ICON_MARK + 220)),
    size: 96,
  },
  {
    file: join(root, 'store', 'google-play', 'graphics', 'icon-512.png'),
    svg: svg(background(VARIANTS['']) + mark(ICON_MARK)),
    size: 512,
  },
];

const playwrightPath = process.env.PLAYWRIGHT;
if (!playwrightPath) {
  console.error(
    'Set PLAYWRIGHT to an installed playwright/index.js (see the header).',
  );
  process.exit(1);
}
const pw = await import(pathToFileURL(playwrightPath).href);
const { chromium } = pw.default ?? pw;
const browser = await chromium.launch();
try {
  for (const { file, svg: markup, size = SIZE } of outputs) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
    });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">` +
        markup.replace(
          `width="${SIZE}" height="${SIZE}"`,
          `width="${size}" height="${size}"`,
        ) +
        `</body></html>`,
    );
    mkdirSync(dirname(file), { recursive: true });
    await page.screenshot({
      path: file,
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    });
    await page.close();
    console.log('wrote', file.slice(root.length + 1));
  }
} finally {
  await browser.close();
}
