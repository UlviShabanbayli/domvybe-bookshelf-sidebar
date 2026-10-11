// SHELF · Library: lesson illustrations, drawn as SVG per course and varied per lesson. Colours come from CSS variables
// (--a-bg, --a-ink, --a-line, --a-teal, --a-teal2, --a-mint, --a-soft, --a-warm) so the evening theme can re-tint them.
const W = 640, H = 340;
// Text in the pictures is HTML laid over the SVG: SVG <text> layout cost ~1–2 ms per label on a slow phone, HTML a fraction.
let labels = [];
const svg = (body, label) => {
  const l = labels.join(''); labels = [];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">${body}</svg>${l ? `<div class="art-l" aria-hidden="true">${l}</div>` : ''}`;
};
const r = (x, y, w, h, f, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${extra}/>`;
const line = (x1, y1, x2, y2, s = 'var(--a-line)', w = 1.4, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" ${extra}/>`;
const text = (x, y, t, size, f = 'var(--a-ink)', extra = '') => {
  const w = (extra.match(/font-weight="(\d+)"/) || [])[1], fam = (extra.match(/font-family="([^"]+)"/) || [])[1];
  const mid = /text-anchor="middle"/.test(extra), tab = /tabular-nums/.test(extra);
  const css = `left:${(x / W * 100).toFixed(3)}%;top:${(y / H * 100).toFixed(3)}%;font-size:${(size / W * 100).toFixed(3)}cqw;color:${f};${w ? `font-weight:${w};` : ''}${fam ? `font-family:${fam};` : ''}${tab ? 'font-variant-numeric:tabular-nums;' : ''}${mid ? 'transform:translate(-50%,-.86em)' : ''}`;
  labels.push(`<span style="${css}">${t}</span>`);
  return '';
};

function grid(n, title) {
  if (n === 5) {   // "Grids that breathe": the concept's piece, redrawn
    const g = [];
    for (const x of [214, 242, 300, 392, 430]) g.push(line(x, 64, x, 286));
    for (const y of [96, 126, 222, 254]) g.push(line(186, y, 470, y));
    return svg(`${g.join('')}
      ${r(242, 96, 30, 30, 'var(--a-ink)')}
      ${r(242, 222, 30, 32, 'var(--a-mint)')}
      <path d="M272 126 h118 a40 40 0 0 1 40 40 v56 a40 40 0 0 1 -40 40 h-118 z" fill="var(--a-teal)"/>
      <path d="M300 224 L376 140 h14 a40 40 0 0 1 40 40 v42 a40 40 0 0 1 -40 40 h-90 z" fill="var(--a-teal2)" opacity=".9"/>
      <path d="M352 186 L404 140 a40 40 0 0 1 26 40 v42 a40 40 0 0 1 -40 40 h-38 z" fill="var(--a-ink)"/>
      ${line(250, 286, 470, 70, 'var(--a-ink)', 2)}`, `${title}: a column grid with blocks spanning columns and space left between them`);
  }
  const cols = n % 3 === 0 ? 4 : n % 2 ? 12 : 8, x0 = 120, w = 400, gut = cols === 12 ? 8 : 14, cw = (w - gut * (cols - 1)) / cols;
  let b = '';
  for (let i = 0; i < cols; i++) b += r(x0 + i * (cw + gut), 54, cw, 232, 'var(--a-soft)', 2, 'opacity=".55"');
  const span = (c0, c1, y, h, f, rx = 6) => r(x0 + c0 * (cw + gut), y, (c1 - c0) * (cw + gut) - gut, h, f, rx);
  const k = cols / 4;
  b += span(0, 4 * k, 70, 46, 'var(--a-ink)', 6);
  b += span(0, 2 * k, 132, 138, 'var(--a-teal)', 8);
  b += span(2 * k, 4 * k, 132, 62, 'var(--a-mint)', 8);
  b += span(2 * k, 3 * k, 208, 62, 'var(--a-teal2)', 8);
  b += span(3 * k, 4 * k, 208, 62, 'var(--a-soft)', 8);
  if (n === 6) b += r(84, 150, 160, 120, 'var(--a-warm)', 10, 'opacity=".9"');
  return svg(b, `${title}: a ${cols}-column grid with content blocks`);
}

function type(n, title) {
  const sets = [['Ag', 'Inter'], ['Rg', 'Cormorant, serif'], ['Aa', 'Inter'], ['', ''], ['', ''], ['', ''], ['fi', 'Cormorant, serif'], ['', ''], ['', '']];
  if (n === 4 || n === 5) {   // scale / weight
    const sizes = [14, 18, 22, 28, 35, 44];
    let y = 70, b = '';
    sizes.forEach((s, i) => { y += s + 10; b += text(130, y, n === 4 ? `${s}px · ${['caption', 'body', 'lead', 'h3', 'h2', 'h1'][i]}` : ['Regular', 'Medium', 'Semibold', 'Bold', 'Extrabold', 'Black'][i], n === 4 ? s : 26, i === 5 ? 'var(--a-teal2)' : 'var(--a-ink)', n === 5 ? `font-weight="${400 + i * 100}"` : 'font-weight="600"'); });
    return svg(b, `${title}: a type scale from small to large`);
  }
  if (n === 6) {
    let b = r(120, 60, 400, 220, 'var(--a-soft)', 10, 'opacity=".45"');
    for (let i = 0; i < 7; i++) b += r(150, 86 + i * 26, i === 6 ? 180 : 330 + (i % 2) * 10, 9, 'var(--a-ink)', 4, 'opacity=".75"');
    b += line(150, 70, 150, 276, 'var(--a-teal2)', 1.5, 'stroke-dasharray="4 4"') + line(490, 70, 490, 276, 'var(--a-teal2)', 1.5, 'stroke-dasharray="4 4"');
    b += text(258, 300, '45–75 characters', 15, 'var(--a-teal2)', 'font-weight="600"');
    return svg(b, `${title}: a text column with its comfortable measure marked`);
  }
  if (n === 8) {
    let b = text(140, 150, '1,284.50', 64, 'var(--a-ink)', 'font-weight="600" style="font-variant-numeric: tabular-nums"');
    b += text(140, 230, '0,961.07', 64, 'var(--a-teal2)', 'font-weight="600" style="font-variant-numeric: tabular-nums"');
    for (let i = 0; i < 8; i++) b += line(140 + i * 38.5, 248, 140 + i * 38.5, 258, 'var(--a-line)', 1.2);
    return svg(b, `${title}: tabular figures lining up in columns`);
  }
    const [g, f] = sets[n - 1] && sets[n - 1][0] ? sets[n - 1] : ['Ag', 'Inter'];
  let b = '';
  const base = 250, xh = 172, asc = 104, desc = 290;
  for (const [y, l] of [[asc, 'ascender'], [xh, 'x-height'], [base, 'baseline'], [desc, 'descender']]) b += line(110, y, 530, y, 'var(--a-line)', 1, 'stroke-dasharray="3 5"') + text(440, y - 6, l, 12, 'var(--a-line)');
  b += text(150, base, g, 200, 'var(--a-ink)', `font-family="${f}" font-weight="${f.includes('Cormorant') ? 600 : 650}"`);
  if (n === 9) b = r(110, 70, 150, 200, 'var(--a-soft)', 12, 'opacity=".6"') + r(290, 90, 240, 160, 'var(--a-soft)', 12, 'opacity=".6"') + text(130, 180, 'Aa', 64, 'var(--a-ink)', 'font-weight="700"') + text(330, 190, 'Aa', 96, 'var(--a-teal2)', 'font-weight="700"');
  return svg(b, `${title}: letterforms with their guide lines`);
}

function color(n, title) {
  let b = '';
  if (n === 1 || n === 2) {
    const L = [96, 86, 76, 64, 52, 40, 28];
    L.forEach((l, i) => { b += r(100 + i * 64, 80, 56, 120, `oklch(${l}% ${n === 1 ? 0.03 + i * 0.02 : 0} 165)`, 8); b += r(100 + i * 64, 216, 56, 40, `oklch(${l}% 0 0)`, 8); });
    return svg(b, `${title}: colour steps above, the same steps in grey below`);
  }
  if (n === 3) { b = r(110, 70, 200, 200, 'oklch(72% 0.14 55)', 16) + r(330, 70, 200, 200, 'oklch(60% 0.08 240)', 16) + text(170, 300, 'warm', 16, 'var(--a-ink)', 'font-weight="600"') + text(398, 300, 'cool', 16, 'var(--a-ink)', 'font-weight="600"'); return svg(b, `${title}: a warm and a cool swatch`); }
  if (n === 4) { for (let i = 0; i < 9; i++) b += r(110 + i * 46, 110, 40, 120, `oklch(${96 - i * 8.5}% 0.006 250)`, 6); b += r(110 + 4 * 46, 80, 40, 180, 'var(--a-teal)', 6); return svg(b, `${title}: nine neutral steps and one accent`); }
  if (n === 5) { for (let i = 0; i < 9; i++) b += r(90 + i * 52, 120, 46, 100, `oklch(${95 - i * 9}% ${0.02 + Math.sin(i / 8 * Math.PI) * 0.12} 175)`, 8); return svg(b, `${title}: a teal ramp in even OKLCH lightness steps`); }
  if (n === 6) {
    const rows = [['neutral-100', 'surface'], ['neutral-700', 'text'], ['teal-600', 'accent']];
    rows.forEach(([p, s], i) => { const y = 80 + i * 64; b += r(110, y, 160, 44, i === 2 ? 'var(--a-teal2)' : i === 1 ? 'var(--a-ink)' : 'var(--a-soft)', 8) + text(122, y + 28, p, 14, i ? '#fff' : 'var(--a-ink)', 'font-weight="600"') + line(280, y + 22, 360, y + 22, 'var(--a-line)', 1.4, 'marker-end="url(#ah)"') + r(370, y, 160, 44, 'none', 8, 'stroke="var(--a-line)" stroke-width="1.4"') + text(384, y + 28, s, 14, 'var(--a-ink)', 'font-weight="600"'); });
    return svg(`<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 8 4 0 8z" fill="var(--a-line)"/></marker></defs>${b}`, `${title}: palette values mapped to semantic roles`);
  }
  if (n === 7) { b = r(110, 80, 190, 170, '#ffffff', 14) + text(150, 190, 'Aa', 72, '#767676', 'font-weight="700"') + r(340, 80, 190, 170, '#ffffff', 14) + text(380, 190, 'Aa', 72, '#1f2937', 'font-weight="700"') + text(160, 286, '4.5 : 1', 16, 'var(--a-ink)', 'font-weight="600"') + text(386, 286, '15 : 1', 16, 'var(--a-ink)', 'font-weight="600"'); return svg(b, `${title}: grey text at 4.5 to 1 and dark text at 15 to 1 on white`); }
  if (n === 8) { b = r(110, 70, 200, 200, '#f6f7f9', 14) + r(130, 96, 160, 30, '#d9dde3', 6) + r(330, 70, 200, 200, '#1c1f24', 14) + r(350, 96, 160, 30, '#2b3038', 6) + r(350, 140, 120, 14, 'oklch(72% 0.11 170)', 7) + r(130, 140, 120, 14, 'oklch(60% 0.14 170)', 7); return svg(b, `${title}: a light surface and its own dark palette`); }
  b = r(120, 90, 180, 56, 'none', 10, 'stroke="#c0392b" stroke-width="3"') + `<circle cx="150" cy="118" r="11" fill="#c0392b"/>` + text(146, 124, '!', 16, '#fff', 'font-weight="800"') + text(170, 125, 'Required', 18, '#c0392b', 'font-weight="600"') + r(340, 90, 180, 56, 'none', 10, 'stroke="var(--a-teal2)" stroke-width="3"') + `<circle cx="366" cy="118" r="7" fill="var(--a-teal2)"/>` + text(382, 124, 'Online', 18, 'var(--a-ink)', 'font-weight="600"');
  return svg(b, `${title}: status shown with colour plus an icon or word`);
}

function system(n, title) {
  let b = '';
  const toks = ['color', 'space', 'type', 'radius'];
  toks.forEach((t, i) => { b += r(90, 70 + i * 54, 120, 40, 'var(--a-soft)', 8) + text(108, 96 + i * 54, t, 15, 'var(--a-ink)', 'font-weight="600"') + line(210, 90 + i * 54, 300, 170, 'var(--a-line)', 1.2); });
  b += r(300, 120, 110, 100, 'var(--a-ink)', 12) + text(322, 176, 'system', 16, '#fff', 'font-weight="600"');
  const comps = n % 2 ? ['Button', 'Card', 'Input'] : ['Header', 'Body', 'Footer'];
  comps.forEach((c, i) => { b += line(410, 170, 450, 90 + i * 80, 'var(--a-line)', 1.2) + r(450, 70 + i * 80, 110, 44, i === 0 ? 'var(--a-teal)' : 'var(--a-mint)', 10) + text(470, 98 + i * 80, c, 15, 'var(--a-ink)', 'font-weight="600"'); });
  return svg(b, `${title}: tokens feeding a system that produces components`);
}

function iconArt(n, title) {
  const x0 = 220, y0 = 50, s = 10;
  let b = r(x0, y0, 240, 240, 'var(--a-soft)', 6, 'opacity=".35"');
  for (let i = 0; i <= 24; i++) { b += line(x0 + i * s, y0, x0 + i * s, y0 + 240, 'var(--a-line)', i % 4 ? 0.4 : 0.9, 'opacity=".5"'); b += line(x0, y0 + i * s, x0 + 240, y0 + i * s, 'var(--a-line)', i % 4 ? 0.4 : 0.9, 'opacity=".5"'); }
  b += r(x0 + 20, y0 + 20, 200, 200, 'none', 0, 'stroke="var(--a-teal2)" stroke-dasharray="5 5" stroke-width="1.5"');
  const shapes = [
    `<circle cx="${x0 + 110}" cy="${y0 + 110}" r="60" fill="none" stroke="var(--a-ink)" stroke-width="18"/><path d="M${x0 + 152} ${y0 + 152} L${x0 + 205} ${y0 + 205}" stroke="var(--a-ink)" stroke-width="18" stroke-linecap="round"/>`,
    `<path d="M${x0 + 50} ${y0 + 120} L${x0 + 120} ${y0 + 50} L${x0 + 190} ${y0 + 120} V${y0 + 200} H${x0 + 50} Z" fill="none" stroke="var(--a-ink)" stroke-width="18" stroke-linejoin="round"/>`,
    `<path d="M${x0 + 120} ${y0 + 40} l24 50 54 8 -40 38 10 54 -48 -26 -48 26 10 -54 -40 -38 54 -8z" fill="none" stroke="var(--a-ink)" stroke-width="16" stroke-linejoin="round"/>`,
  ];
  b += shapes[n % 3];
  return svg(b, `${title}: an icon drawn on a 24 by 24 grid with its safe area`);
}

function form(n, title) {
  let b = r(170, 40, 300, 260, 'var(--a-card)', 16);
  b += text(196, 84, n === 1 ? 'Email address' : n === 3 ? 'Start date' : 'Full name', 14, 'var(--a-ink)', 'font-weight="600"');
  b += r(196, 96, 248, 44, 'none', 8, `stroke="${n === 3 ? '#c0392b' : 'var(--a-line)'}" stroke-width="1.5"`);
  b += text(210, 124, n === 1 ? 'ana@studio.com' : n === 3 ? '12/10/2025' : 'Ana Lima', 15, 'var(--a-ink)');
  if (n === 3) b += text(196, 162, 'Enter a date after today', 13, '#c0392b', 'font-weight="600"');
  if (n === 4) for (let i = 0; i < 4; i++) b += `<circle cx="${236 + i * 56}" cy="190" r="10" fill="${i < 2 ? 'var(--a-teal2)' : 'var(--a-soft)'}"/>` + (i < 3 ? line(246 + i * 56, 190, 282 + i * 56, 190, i < 1 ? 'var(--a-teal2)' : 'var(--a-soft)', 3) : '');
  b += r(196, 236, 248, 44, 'var(--a-teal2)', 10) + text(n === 5 ? 262 : 280, 264, n === 5 ? 'Create account' : 'Continue', 15, '#fff', 'font-weight="600"');
  return svg(b, `${title}: a form field with a visible label and a clear button`);
}

function motion(n, title) {
  // cubic curves in a 400 × 200 box (time → value), sampled at equal times so the dots show the speed
  const C = [[0.42, 0, 0.58, 1], [0.05, 0.9, 0.35, 1], [0, 1, 0.3, 1], [0.2, 1.25, 0.4, 1], [0, 0, 1, 1], [0.6, 0, 0.9, 0.4], [0.3, 0, 0.2, 1]][(n - 1) % 7];
  const bz = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  const X = (t) => 120 + bz(t, C[0], C[2]) * 400, Y = (t) => 270 - bz(t, C[1], C[3]) * 200;
  // solve x(t) = equal time steps
  const at = (u) => { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bz(m, C[0], C[2]) < u) lo = m; else hi = m; } return (lo + hi) / 2; };
  let d = `M${X(0)} ${Y(0)}`; for (let i = 1; i <= 48; i++) d += ` L${X(i / 48).toFixed(1)} ${Y(i / 48).toFixed(1)}`;
  let b = line(120, 50, 120, 280, 'var(--a-line)', 1) + line(110, 270, 530, 270, 'var(--a-line)', 1);
  b += `<path d="${d}" fill="none" stroke="var(--a-teal2)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (let i = 0; i <= 8; i++) { const t = at(i / 8); b += `<circle cx="${X(t).toFixed(1)}" cy="${Y(t).toFixed(1)}" r="7" fill="var(--a-ink)" opacity="${(0.3 + i * 0.085).toFixed(2)}"/>`; b += `<circle cx="560" cy="${Y(t).toFixed(1)}" r="5" fill="var(--a-teal)" opacity="${(0.3 + i * 0.085).toFixed(2)}"/>`; }
  b += text(130, 300, 'time', 13, 'var(--a-line)') + text(56, 76, 'value', 13, 'var(--a-line)');
  return svg(b, `${title}: an easing curve with positions sampled at equal times`);
}

function words(n, title) {
  let b = r(150, 50, 340, 240, 'var(--a-card)', 16);
  b += r(180, 84, 200, 16, 'var(--a-ink)', 8);
  for (let i = 0; i < 3; i++) b += r(180, 120 + i * 22, i === 2 ? 170 : 270, 10, 'var(--a-soft)', 5);
  const labels = [['Keep editing', 'Discard draft'], ['Cancel', 'Delete project'], ['Not now', 'Save changes']][n % 3];
  b += r(180, 222, 130, 42, 'none', 10, 'stroke="var(--a-line)" stroke-width="1.4"') + text(198, 248, labels[0], 14, 'var(--a-ink)', 'font-weight="600"');
  b += r(322, 222, 140, 42, n % 3 === 1 ? '#c0392b' : 'var(--a-teal2)', 10) + text(338, 248, labels[1], 14, '#fff', 'font-weight="600"');
  return svg(b, `${title}: a dialog whose buttons say what they do`);
}

function a11y(n, title) {
  let b = '';
  if (n === 3 || n === 4 || n === 5) {
    b = r(170, 120, 300, 100, 'none', 22, 'stroke="var(--a-teal2)" stroke-width="4"') + r(180, 130, 280, 80, 'var(--a-ink)', 16) + text(254, 178, 'Continue', 22, '#fff', 'font-weight="600"');
    b += ['Tab', 'Esc', 'Enter'].map((k, i) => r(214 + i * 76, 252, 60, 42, 'var(--a-card)', 8, 'stroke="var(--a-line)" stroke-width="1.2"') + text(244 + i * 76, 278, k, 14, 'var(--a-ink)', 'font-weight="600" text-anchor="middle"')).join('');
    return svg(b, `${title}: a button with a visible focus ring and keyboard keys`);
  }
  b = r(120, 70, 400, 200, 'var(--a-card)', 16) + `<circle cx="210" cy="170" r="54" fill="var(--a-mint)"/><path d="M186 176 l18 18 34 -40" fill="none" stroke="var(--a-teal2)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (let i = 0; i < 4; i++) b += r(290, 120 + i * 24, i === 3 ? 120 : 190, 10, 'var(--a-soft)', 5);
  return svg(b, `${title}: content paired with a clear text alternative`);
}

function starter(n, title) {
  let b = r(200, 40, 240, 260, 'var(--a-card)', 12);
  b += r(226, 70, 140, 14, 'var(--a-ink)', 7);
  for (let i = 0; i < 5; i++) b += `<circle cx="236" cy="${118 + i * 34}" r="6" fill="${i < n ? 'var(--a-teal2)' : 'var(--a-soft)'}"/>` + r(254, 112 + i * 34, 150 - (i % 2) * 30, 10, 'var(--a-soft)', 5);
  return svg(b, `${title}: a course outline`);
}

const ARTS = { grid, type, color, system, icon: iconArt, form, motion, words, a11y, starter };
export const art = (kind, n, title) => { labels = []; return (ARTS[kind] || starter)(n, title); };
