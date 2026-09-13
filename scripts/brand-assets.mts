import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Writes the brand SVGs in public/brand. Run once after a build (it embeds the
 * Big Shoulders font next/font downloaded, so the wordmark keeps its face when
 * the file is opened on its own): pnpm tsx scripts/brand-assets.mts
 *
 * The mark's geometry here is the same as src/components/brand/BrandLogo.tsx.
 * Change both together.
 */

const BLUE = '#1B3BD1';
const INK = '#000000';
const WHITE = '#FFFFFF';

/** The mark, drawn on a 48-unit grid: a medical cross carrying a network of four nodes and a hub. */
function markShapes({ tile, cross, network, hub }: { tile: string; cross: string; network: string; hub: string }): string {
  return `
  <rect x="1.5" y="1.5" width="45" height="45" fill="${tile}" stroke="${INK}" stroke-width="3"/>
  <path d="M18.5 7.5h11v11h11v11h-11v11h-11v-11h-11v-11h11z" fill="${cross}"/>
  <path d="M24 13v22M13 24h22" stroke="${network}" stroke-width="2"/>
  <g fill="${network}"><circle cx="24" cy="13" r="3"/><circle cx="35" cy="24" r="3"/><circle cx="24" cy="35" r="3"/><circle cx="13" cy="24" r="3"/></g>
  <rect x="21.5" y="21.5" width="5" height="5" fill="${hub}" stroke="${INK}" stroke-width="1.6"/>`;
}

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-labelledby="t">
  <title id="t">DApp Doctor</title>${markShapes({ tile: BLUE, cross: WHITE, network: INK, hub: BLUE })}
</svg>
`;

// The favicon drops the network: at 16 px it would only read as specks. Cross and hub remain.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect x="1" y="1" width="30" height="30" fill="${BLUE}" stroke="${INK}" stroke-width="2"/>
  <path d="M12.25 5h7.5v7.25H27v7.5h-7.25V27h-7.5v-7.25H5v-7.5h7.25z" fill="${WHITE}"/>
  <rect x="13.5" y="13.5" width="5" height="5" fill="${INK}"/>
</svg>
`;

function fontFace(): string {
  const css = readdirSync('.next/static/css').map((f) => readFileSync(join('.next/static/css', f), 'utf8')).join('\n');
  const rule = css.match(/@font-face\{font-family:Big Shoulders;[^}]*src:url\(\/_next\/static\/media\/([^)]+\.woff2)\)[^}]*unicode-range:u\+00\?\?[^}]*\}/);
  if (!rule) throw new Error('Big Shoulders (latin) not found in .next: run pnpm build first.');
  const font = readFileSync(join('.next/static/media', rule[1])).toString('base64');
  // The font is variable, so one file serves weight 900. SIL Open Font License.
  return `@font-face{font-family:'DApp Doctor Display';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;}`;
}

const WORDMARK = `font-family:'DApp Doctor Display','Big Shoulders','Arial Narrow',sans-serif;font-weight:900;font-size:38px;letter-spacing:-0.5px`;

// Works on white, black and transparent: the wordmark sits on its own white label, so it never needs the page's colour.
const horizontal = (face: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 273 56" width="273" height="56" role="img" aria-labelledby="t">
  <title id="t">DApp Doctor</title>
  <style>${face}</style>
  <rect x="54.5" y="1.5" width="217" height="53" fill="${WHITE}" stroke="${INK}" stroke-width="3"/>
  <svg x="0" y="0" width="56" height="56" viewBox="0 0 48 48">${markShapes({ tile: BLUE, cross: WHITE, network: INK, hub: BLUE })}</svg>
  <text x="70" y="42" fill="${INK}" style="${WORDMARK}">DApp Doctor</text>
</svg>
`;

// One colour, for print and stamps: a black tile with the cross cut out, the network drawn inside it.
const monochrome = (face: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 259 56" width="259" height="56" role="img" aria-labelledby="t">
  <title id="t">DApp Doctor</title>
  <style>${face}</style>
  <defs>
    <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
      <rect width="48" height="48" fill="#fff"/>
      <path d="M18.5 7.5h11v11h11v11h-11v11h-11v-11h-11v-11h11z" fill="#000"/>
    </mask>
  </defs>
  <svg x="0" y="0" width="56" height="56" viewBox="0 0 48 48">
    <rect x="0" y="0" width="48" height="48" fill="${INK}" mask="url(#cut)"/>
    <path d="M24 13v22M13 24h22" stroke="${INK}" stroke-width="2"/>
    <g fill="${INK}"><circle cx="24" cy="13" r="3"/><circle cx="35" cy="24" r="3"/><circle cx="24" cy="35" r="3"/><circle cx="13" cy="24" r="3"/></g>
    <rect x="21.5" y="21.5" width="5" height="5" fill="${INK}"/>
  </svg>
  <text x="68" y="42" fill="${INK}" style="${WORDMARK}">DApp Doctor</text>
</svg>
`;

mkdirSync('public/brand', { recursive: true });
const face = fontFace();
writeFileSync('public/brand/dapp-doctor-mark.svg', mark);
writeFileSync('public/brand/favicon.svg', favicon);
writeFileSync('public/brand/dapp-doctor-logo-horizontal.svg', horizontal(face));
writeFileSync('public/brand/dapp-doctor-logo-monochrome.svg', monochrome(face));
console.log('wrote public/brand: mark, favicon, horizontal and monochrome logos');
