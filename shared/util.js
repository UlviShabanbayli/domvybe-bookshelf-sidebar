// SHELF: small shared helpers (storage, live region, toast, hashing, html escaping).

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const raf = () => new Promise((r) => requestAnimationFrame(r));
export const frames = async (n = 2) => { for (let i = 0; i < n; i++) await raf(); };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** stable 0..1 from a string (book sizes and small irregularities come from the id, so they never jump between loads) */
export function hash01(s, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** wrap matches of q in <mark> (input is plain text; output is safe HTML) */
export function markText(text, q) {
  if (!q) return esc(text);
  const t = String(text), low = t.toLowerCase(), ql = q.toLowerCase();
  let out = '', i = 0, j;
  while ((j = low.indexOf(ql, i)) !== -1) { out += esc(t.slice(i, j)) + '<mark>' + esc(t.slice(j, j + q.length)) + '</mark>'; i = j + q.length; }
  return out + esc(t.slice(i));
}

/** localStorage with a fallback: private windows / blocked storage must not break the page */
export function store(key, defaults) {
  let data;
  try { data = JSON.parse(localStorage.getItem(key)); } catch (e) { data = null; }
  data = Object.assign(structuredClone(defaults), data || {});
  let t = 0;
  const api = {
    data,
    save(now = false) {
      clearTimeout(t);
      const w = () => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage unavailable: keep working in memory */ } };
      if (now) w(); else t = setTimeout(w, 250);
    },
    reset() { try { localStorage.removeItem(key); } catch (e) {} },
  };
  addEventListener('pagehide', () => api.save(true));
  return api;
}

/** one polite live region per page; repeated identical messages are still announced */
export function announcer(el) {
  let n = 0;
  return (msg) => { el.textContent = ''; const k = ++n; setTimeout(() => { if (k === n) el.textContent = msg; }, 40); };
}

export function toaster(el) {
  let t = 0;
  return (msg, action) => {
    el.innerHTML = ''; const s = document.createElement('span'); s.textContent = msg; el.append(s);
    if (action) { const b = document.createElement('button'); b.type = 'button'; b.textContent = action.label; b.onclick = () => { action.run(); el.classList.remove('on'); }; el.append(b); }
    el.classList.add('on'); clearTimeout(t); t = setTimeout(() => el.classList.remove('on'), action ? 6000 : 2600);
  };
}

/** mark what must be fully on screen for _studio/responsive_check.py: every control except books in a scrolling strip */
export function markFit(root = document) {
  for (const el of root.querySelectorAll('button, a[href], input, textarea, h1, h2, h3, [role=button]')) {
    const strip = el.classList.contains('book') && el.closest('[data-mode="strip"]');
    if (strip) el.removeAttribute('data-fit'); else el.setAttribute('data-fit', '');
  }
}

/** icons: 24×24 line icons drawn for this project (stroke = currentColor) */
const P = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  lamp: '<path d="M8 3h8l3 8H5l3-8Z"/><path d="M12 11v8M8 21h8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  more: '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z"/><path d="M12 6.5V20"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  mug: '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1 1 1.5 1 2.5M11.5 3.5c0 1 1 1.5 1 2.5"/>',
  plane: '<path d="M10.5 13.5 3 11l1.5-1.5 8 .5 4-4a2 2 0 0 1 3 3l-4 4 .5 8L14.5 22 12 14.5"/>',
  doc: '<path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v4h4M10 12h5M10 15.5h5"/>',
  journal: '<rect x="5" y="3" width="13" height="18" rx="2"/><path d="M9 3v18M12 8h3"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9L12 3.5Z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-7 10-9"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  move: '<path d="M4 7h16M4 12h10M4 17h7M17 14l3 3-3 3"/>',
};
export const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
export const ICON_NAMES = Object.keys(P);
