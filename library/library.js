// SHELF · Library: a course site whose sidebar is a walnut bookcase. The active book flies out and opens in the sidebar;
// its chapters are a real ARIA tree; lessons render in the main area and progress is kept in localStorage.
import { Shelf } from '../shared/shelf.js';
import { Sheet } from '../shared/sheet.js';
import { store, announcer, toaster, icon, esc, markText, hash01, clamp, reducedMotion, raf, markFit, sleep } from '../shared/util.js';
import { COURSES, starterCourse, prepare, CLOTH } from './data.js';
import { art } from './art.js';

const $ = (s) => document.querySelector(s);
const app = $('#app'), scene = $('#scene');
const say = announcer($('#live')), toast = toaster($('#toast'));

/* ------------------------------------------------------------------ data + state */
const courses = new Map(COURSES.map((c) => [c.id, prepare(structuredClone(c))]));
const DEFAULT_DONE = ['layout/white-space-is-structure', 'layout/the-8-point-rhythm', 'layout/proximity-groups', 'layout/columns-and-gutters',
  'typography/anatomy-of-a-letter', 'typography/choosing-a-typeface', 'typography/type-on-screens', 'color/hue-value-chroma', 'motion/motion-carries-meaning'];
const S = store('shelf.library.v1', {
  order: COURSES.map((c) => c.id), done: Object.fromEntries(DEFAULT_DONE.map((k) => [k, 1])),
  current: 'layout/grids-that-breathe', last: {}, custom: [], rail: false, closed: false,
});
for (const c of S.data.custom) courses.set(c.id, prepare(starterCourse(c.id, c.title, c.color)));
S.data.order = S.data.order.filter((id) => courses.has(id));
for (const id of courses.keys()) if (!S.data.order.includes(id)) S.data.order.push(id);

const lessonById = (id) => { const [c] = id.split('/'); return courses.get(c)?.lessons.find((l) => l.id === id) || null; };
const doneCount = (c) => c.lessons.reduce((n, l) => n + (S.data.done[l.id] ? 1 : 0), 0);
const resumeLesson = (c) => lessonById(S.data.last[c.id] || '') || c.lessons.find((l) => !S.data.done[l.id]) || c.lessons[0];

/* ------------------------------------------------------------------ shelf */
const face = (c, mode) => `
  <span class="book__spine" style="--len:${Math.max(4, c.title.length)}">
    <span class="book__bands"></span>
    <span class="book__title">${esc(c.title)}</span>
    <span class="book__abbr">${esc(c.abbr)}</span>
    <span class="book__dim"></span>
  </span>
  <span class="book__cover"><span class="book__cover-t">${esc(c.title)}</span></span>
  <span class="book__back"></span>
  <span class="book__top"></span>`;

const hf = (id) => 0.84 + hash01(id, 1) * 0.13;
const tf = (c) => (c.tf || 1) * (0.95 + hash01(c.id, 2) * 0.1);

function configs(mode, W, H) {
  if (mode === 'rail') {
    return [{ key: `rail${W}`, rows: [{ mode: 'column', x: 0, top: 10, w: W, h: Infinity, gap: 7 }], unit: { w: 30, h: W - 14 },
      extent: { h: (pos) => Math.max(...[...pos.values()].map((p) => p.y)) + 14 } }];
  }
  if (mode === 'strip') {
    return [{ key: `strip${H}`, rows: [{ mode: 'upright', x: 14, base: H - 16, w: Infinity, h: H, gap: 2 }], unit: { w: H / 4.3, h: H - 34 },
      extent: { w: (pos) => Math.max(...[...pos.values()].map((p) => p.x + p.w)) + 18 } }];
  }
  const b = 18, inner = H - 2 * b, c0 = Math.round(inner * 0.23), c1 = Math.round(inner * 0.385), c2 = inner - c0 - c1;
  const h = Math.min(Math.min(c1, c2) - 18, W - 30);
  return [1, 0.9, 0.8, 0.72, 0.64, 0.56].map((k) => ({
    key: `desk${W}x${H}k${k}`, k, boards: [c0, c0 + b + c1], b,
    rows: [
      { mode: 'flat', x: 10, base: c0, w: W - 20, h: c0 - 16, max: 2, gap: 1, jitter: (id, i) => (hash01(id, 3) - 0.5) * 16 + (i ? 8 : 0) },
      { mode: 'upright', x: 6, base: c0 + b + c1, w: W - 12, h: c1 - 10, max: 4, lean: 17, gap: 1.5 },
      { mode: 'upright', x: 6, base: H, w: W - 12, h: c2 - 10, gap: 1.5 },
    ],
    unit: { w: Math.min((W - 12) / 4.3, (c0 - 18) / 2.3) * k, h },   // two books must lie in the top compartment
  }));
}

const coarse = matchMedia('(pointer: coarse)');
function dims(c, cfg, mode) {
  // on touch screens a spine is at least a fingertip wide
  if (mode === 'rail') return { w: coarse.matches ? clamp(Math.round(44 * tf(c)), 44, 52) : clamp(Math.round(cfg.unit.w * tf(c)), 22, 38), h: cfg.unit.h };
  if (mode === 'strip') return { w: Math.max(coarse.matches ? 44 : 0, Math.round(cfg.unit.w * tf(c))), h: Math.round(cfg.unit.h * (0.86 + hash01(c.id, 1) * 0.14)) };
  return { w: Math.max(coarse.matches ? 44 : 0, Math.round(cfg.unit.w * tf(c))), h: Math.round(cfg.unit.h * hf(c.id)) };
}

let boardsKey = '';
function afterLayout(pos, cfg, mode) {
  if (mode !== 'desk' || cfg.key === boardsKey) { if (mode !== 'desk') { scene.querySelectorAll('.board').forEach((e) => e.remove()); boardsKey = ''; } return; }
  boardsKey = cfg.key;
  scene.parentElement.style.setProperty('--b0', (16 + cfg.boards[0] + cfg.b) + 'px');
  scene.querySelectorAll('.board').forEach((e) => e.remove());
  for (const y of cfg.boards) {
    const d = document.createElement('div'); d.className = 'board'; d.setAttribute('aria-hidden', 'true');
    d.style.transform = `translate3d(0, ${y}px, 0)`; d.style.height = cfg.b + 'px';
    scene.prepend(d);
  }
}

const shelf = new Shelf(scene, {
  afterPaint: (li) => markFit(li),
  items: courses, order: S.data.order, face, dims, configs, afterLayout,
  listLabel: 'Courses', controls: 'tome',
  label: (c) => c.title,
  describe: (c) => `${doneCount(c)} of ${c.lessons.length} lessons done`,
  announce: say,
  onSelect: (id) => pickCourse(id),
  onReorder: (order) => { S.data.order = [...order]; S.save(); updateMover(); },
});
shelf.ul.setAttribute('aria-describedby', 'shelf-help');

/* ------------------------------------------------------------------ layout modes */
let layout = 'desk';
function decideLayout() {
  const w = innerWidth, h = innerHeight;
  if (w < 720) return 'phone';
  if (w < 1000 || h < 560 || S.data.rail) return 'rail';
  return 'desk';
}
const forcedRail = () => innerWidth < 1000 || innerHeight < 560;

function applyLayout(force = false) {
  const next = decideLayout();
  if (next === layout && !force) { sizeTome(); return; }
  layout = next; app.dataset.layout = next;
  $('#rail').hidden = next === 'phone' || forcedRail();
  $('#rail').setAttribute('aria-pressed', String(next === 'rail'));
  $('#rail').setAttribute('aria-label', next === 'rail' ? 'Expand the shelf' : 'Collapse shelf to a rail');
  shelf.setMode(next === 'phone' ? 'strip' : next === 'rail' ? 'rail' : 'desk');
  // the chapter tree lives in the open book on desktop and in the sheet on phones
  const tree = $('#tree');
  if (tree) (next === 'phone' ? $('#sheet-body') : $('#tree-host')).append(tree);
  sheet.enable(next === 'phone');
  requestAnimationFrame(() => markFit());
  if (next === 'phone') { searchOpen(!!$('#q').value); }
  else $('#search-row').hidden = false;
  sizeTome();
  if (openId && next !== 'phone') { tomeEl.hidden = false; tomeEl.classList.add('is-open'); shelf.node(openId)?.classList.add('is-out'); }
  if (next === 'phone' && openId) shelf.node(openId)?.classList.remove('is-out');
}

let ro = new ResizeObserver(() => { shelf.layout(false); applyLayout(); });
ro.observe(scene);
addEventListener('resize', () => applyLayout());

/* ------------------------------------------------------------------ the open book (tome) */
const tomeEl = $('#tome'), body = $('#tome-body'), wrap = $('#tome-wrap');
let openId = null, seq = 0;

function sizeTome() {
  if (layout === 'phone') return;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const tw = clamp(Math.round(layout === 'rail' ? W - 34 : W + 22), 190, 380), th = clamp(Math.round(Math.min(H - 24, tw * (layout === 'rail' ? 1.6 : 1.25))), 200, 480);
  tomeEl.style.setProperty('--tw', tw + 'px'); tomeEl.style.setProperty('--th', th + 'px');
  if (openId) setThickness(openId);
}
function setThickness(id) {
  const p = shelf.pos.get(id), th = parseFloat(tomeEl.style.getPropertyValue('--th')) || 320;
  const t = p ? clamp(Math.round((p.w / p.h) * th * 0.9), 18, 40) : 26;
  tomeEl.style.setProperty('--tt', t + 'px');
}

function dressTome(c) {
  tomeEl.style.setProperty('--c', c.color);
  tomeEl.querySelector('.tome__spine-t').textContent = c.title;
  tomeEl.querySelector('.tome__foil').textContent = c.title;
  $('#tome-title').textContent = c.title;
  renderTree(c);
  updateMeta(c);
  setThickness(c.id);
}

function spineStart(id) {
  const li = shelf.node(id), p = shelf.pos.get(id); if (!li || !p) return null;
  const r = li.getBoundingClientRect(), t = tomeEl.getBoundingClientRect();
  const th = t.height || 1;
  return { dx: r.left + r.width / 2 - (t.left + t.width / 2), dy: r.top + r.height / 2 - (t.top + t.height / 2), s: clamp(p.h / th, 0.25, 1.4), rot: p.rot + (p.lean || 0) };
}

async function openTome(id, animate = true) {
  const k = ++seq, c = courses.get(id);
  for (const a of body.getAnimations()) a.cancel();
  openId = id; shelf.select(id);
  dressTome(c);
  if (layout === 'phone') { tomeEl.hidden = true; $('#side-empty').hidden = true; updateSheetHead(c); return; }
  $('#side-empty').hidden = true;
  tomeEl.hidden = false;
  if (!animate || reducedMotion()) {
    tomeEl.classList.add('no-anim', 'is-open'); shelf.node(id)?.classList.add('is-out');
    await raf(); tomeEl.classList.remove('no-anim'); return;
  }
  tomeEl.classList.add('no-anim'); tomeEl.classList.remove('is-open', 'is-settled');
  const st = spineStart(id);
  await raf(); if (k !== seq) return;
  tomeEl.classList.remove('no-anim');
  shelf.node(id)?.classList.add('is-out');
  if (st) {
    body.animate([
      { transform: `translate3d(${st.dx}px, ${st.dy}px, 0) rotate(${st.rot}deg) rotateY(90deg) scale(${st.s})`, opacity: 0.0, offset: 0 },
      { opacity: 1, offset: 0.12 },
      { transform: `translate3d(${st.dx * 0.32}px, ${st.dy * 0.32 - 26}px, 70px) rotate(${st.rot * 0.25}deg) rotateY(38deg) scale(${(st.s + 1) / 2 * 1.04})`, offset: 0.52 },
      { transform: 'translate3d(0, 0, 0) rotate(0deg) rotateY(0deg) scale(1)', opacity: 1, offset: 1 },
    ], { duration: 640, easing: 'cubic-bezier(.3,.66,.22,1)' });
  }
  await sleep(st ? 470 : 0); if (k !== seq) return;
  tomeEl.classList.add('is-open');
  await sleep(700); if (k !== seq) return;
  tomeEl.classList.add('is-settled');
}

async function closeTome(animate = true) {
  const k = ++seq, id = openId; if (!id) return;
  openId = null;
  if (layout === 'phone' || !animate || reducedMotion()) {
    tomeEl.classList.remove('is-open', 'is-settled'); tomeEl.hidden = true; $('#side-empty').hidden = layout === 'phone'; shelf.node(id)?.classList.remove('is-out'); shelf.select(null);
    return;
  }
  tomeEl.classList.remove('is-open', 'is-settled');
  await sleep(300); if (k !== seq) return;
  const st = spineStart(id);
  if (st) {
    const a = body.animate([
      { transform: 'translate3d(0, 0, 0) rotate(0deg) rotateY(0deg) scale(1)', opacity: 1 },
      { transform: `translate3d(${st.dx * 0.3}px, ${st.dy * 0.3 - 20}px, 60px) rotate(${st.rot * 0.3}deg) rotateY(40deg) scale(${(st.s + 1) / 2})`, opacity: 1, offset: 0.45 },
      { transform: `translate3d(${st.dx}px, ${st.dy}px, 0) rotate(${st.rot}deg) rotateY(90deg) scale(${st.s})`, opacity: 0.2 },
    ], { duration: 440, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
    await sleep(330); if (k !== seq) { a.cancel(); return; }
    shelf.node(id)?.classList.remove('is-out');
    await sleep(110); if (k !== seq) { a.cancel(); return; }
    a.cancel();
  } else shelf.node(id)?.classList.remove('is-out');
  if (k !== seq) return;
  tomeEl.hidden = true; $('#side-empty').hidden = false;
}

async function switchTo(id, animate) {
  if (openId === id) return;
  if (openId && layout !== 'phone') { await closeTome(animate); }
  await openTome(id, animate);
}

/* ------------------------------------------------------------------ chapter tree (ARIA tree pattern) */
let query = '';
function renderTree(c) {
  const html = treeHTML(c);
  const old = $('#tree');
  const host = layout === 'phone' ? $('#sheet-body') : $('#tree-host');
  if (old) old.remove();
  host.insertAdjacentHTML('beforeend', html);
  markFit(host);
  updateTree();
}
function treeHTML(c) {
  return `<ul class="tree" id="tree" role="tree" aria-label="${esc(c.title)} chapters">${c.chapters.map((ch) => `
    <li class="ch" role="treeitem" aria-level="1" aria-expanded="true" tabindex="-1" data-ch="${ch.index}">
      <span class="ch__t"><span class="ch__chev" aria-hidden="true">${icon('chevD')}</span><span class="ch__n">Chapter ${ch.index}</span><span class="ch__name">${esc(ch.title)}</span></span>
      <ul role="group">${ch.lessons.map((l) => `<li role="none"><a class="ls" role="treeitem" aria-level="2" href="#/${l.id}" tabindex="-1" data-id="${l.id}"><span class="ls__tick" aria-hidden="true">${icon('check')}</span><span class="ls__t">${esc(l.title)}</span><span class="sr-only ls__s"></span></a></li>`).join('')}</ul>
    </li>`).join('')}</ul>`;
}

function updateTree() {
  const tree = $('#tree'); if (!tree) return;
  const cur = S.data.current, q = query.toLowerCase();
  let stop = null;
  const setAttr = (el, k, v) => { if (el.getAttribute(k) !== v) { if (v === null) el.removeAttribute(k); else el.setAttribute(k, v); } };
  for (const a of tree.querySelectorAll('.ls')) {
    const l = lessonById(a.dataset.id), done = !!S.data.done[l.id], on = l.id === cur;
    // touch only what changed: this runs on every route and every keystroke of a search
    a.classList.toggle('is-done', done);
    setAttr(a, 'aria-selected', String(on));
    setAttr(a, 'aria-current', on ? 'page' : null);
    if (on) stop = a;
    const s = a.querySelector('.ls__s'), st = done ? ', completed' : ''; if (s.textContent !== st) s.textContent = st;
    const hit = q && (l.title.toLowerCase().includes(q) || l.lead.toLowerCase().includes(q) || l.body.some((p) => p.toLowerCase().includes(q)));
    if (a.dataset.q !== q) { a.dataset.q = q; a.querySelector('.ls__t').innerHTML = q ? markText(l.title, query) : esc(l.title); }
    a.classList.toggle('is-hit', !!hit);
    a.classList.toggle('is-miss', !!q && !hit && !courseTitleHit(l.course));
  }
  const want = stop || tree.querySelector('[role=treeitem]');
  if (want.tabIndex !== 0 || tree.querySelectorAll('[tabindex="0"]').length !== 1) { for (const it of tree.querySelectorAll('[role=treeitem]')) if (it !== want && it.tabIndex !== -1) it.tabIndex = -1; want.tabIndex = 0; }
}
const courseTitleHit = (cid) => query && courses.get(cid).title.toLowerCase().includes(query.toLowerCase());

function visibleItems(tree) {
  return [...tree.querySelectorAll('[role=treeitem]')].filter((el) => !el.closest('[aria-expanded="false"] [role=group]'));
}
function focusItem(el) {
  const tree = el.closest('[role=tree]');
  for (const it of tree.querySelectorAll('[role=treeitem]')) it.tabIndex = -1;
  el.tabIndex = 0; el.focus();
  el.scrollIntoView?.({ block: 'nearest' });
}
function toggleCh(ch, open = ch.getAttribute('aria-expanded') !== 'true') { ch.setAttribute('aria-expanded', String(open)); }

document.addEventListener('keydown', (e) => {
  const it = e.target.closest?.('#tree [role=treeitem]'); if (!it) return;
  const tree = it.closest('[role=tree]'), vis = visibleItems(tree), i = vis.indexOf(it), isCh = it.classList.contains('ch');
  let handled = true;
  switch (e.key) {
    case 'ArrowDown': if (vis[i + 1]) focusItem(vis[i + 1]); break;
    case 'ArrowUp': if (vis[i - 1]) focusItem(vis[i - 1]); break;
    case 'Home': focusItem(vis[0]); break;
    case 'End': focusItem(vis[vis.length - 1]); break;
    case 'ArrowRight': if (isCh) { if (it.getAttribute('aria-expanded') === 'false') toggleCh(it, true); else focusItem(it.querySelector('.ls')); } break;
    case 'ArrowLeft': if (isCh) { if (it.getAttribute('aria-expanded') === 'true') toggleCh(it, false); } else focusItem(it.closest('.ch')); break;
    case 'Enter': case ' ': if (isCh) toggleCh(it); else { location.hash = it.getAttribute('href'); } break;
    case 'Escape': if (layout !== 'phone' && openId) { const id = openId; closeTome(); S.data.closed = true; S.save(); shelf.focus(id); } else handled = false; break;
    default: handled = false;
  }
  if (handled) { e.preventDefault(); e.stopPropagation(); }
});
document.addEventListener('click', (e) => {
  const t = e.target.closest?.('#tree .ch__t'); if (t) { const ch = t.closest('.ch'); toggleCh(ch); focusItem(ch); }
  const a = e.target.closest?.('#tree .ls'); if (a && layout === 'phone') setTimeout(() => sheet.set('peek'), 60);
});

/* ------------------------------------------------------------------ lesson + progress */
const article = $('#article');
function renderLesson(l, sync = false) {
  const c = courses.get(l.course), i = c.lessons.indexOf(l), next = c.lessons[i + 1];
  const done = !!S.data.done[l.id];
  const k = ++renderSeq;
  // two frames: the heading and picture first, the text a frame later (each half fits a frame on a slow phone)
  article.innerHTML = `
    <p class="lesson__eyebrow">Lesson <span class="lesson__dot">·</span> ${l.n} of ${c.lessons.length} <span class="lesson__dot">·</span> ${l.min} min</p>
    <h1 class="lesson__title" id="lesson-title">${esc(l.title)}</h1>
    <figure class="lesson__art"></figure>
    <div class="lesson__text"></div>`;
  const pic = art(c.art, l.n, l.title);
  const rest = `
    <p class="lesson__lead">${esc(l.lead)}</p>
    ${l.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    <aside class="lesson__tip" aria-label="Takeaway"><span class="lesson__tip-k">Takeaway</span>${esc(l.tip)}</aside>
    <div class="lesson__nav">
      <button class="btn btn--done${done ? ' is-done' : ''}" type="button" id="done" aria-pressed="${done}">${icon('check')}<span>${done ? 'Completed' : 'Mark as complete'}</span></button>
      ${next ? `<a class="btn btn--ghost" href="#/${next.id}">Next: ${esc(next.title)} ${icon('arrowR')}</a>` : `<span class="lesson__end">Last lesson in ${esc(c.title)}</span>`}
    </div>`;
  // three frames on the way in: heading, then the picture (SVG text is the costly part), then the text
  const fillArt = () => { if (k === renderSeq) article.querySelector('.lesson__art').innerHTML = pic; };
  const fill = () => { if (k === renderSeq) { const t = article.querySelector('.lesson__text'); t.innerHTML = rest; markFit(t); } };
  if (sync) { fillArt(); fill(); } else requestAnimationFrame(() => { fillArt(); requestAnimationFrame(fill); });
  updateProgress(c, false);
}
let renderSeq = 0;

function updateProgress(c, animate = true) {
  const n = doneCount(c), t = c.lessons.length;
  $('#progress-count').textContent = `${n} / ${t}`;
  $('#progress-label').textContent = `${c.title} progress`;
  const bar = $('#progress-bar'); bar.setAttribute('aria-valuemax', t); bar.setAttribute('aria-valuenow', n); bar.setAttribute('aria-valuetext', `${n} of ${t} lessons done`);
  const f = $('#progress-fill'); if (!animate) f.classList.add('no-anim');
  f.style.transform = `scaleX(${t ? n / t : 0})`;
  if (!animate) requestAnimationFrame(() => f.classList.remove('no-anim'));
  updateMeta(c);
}
function updateMeta(c) {
  const n = doneCount(c), t = c.lessons.length;
  $('#tome-meta').innerHTML = `${n} of ${t} lessons done${c.custom ? ` · <button type="button" class="linkbtn" id="remove-course">Remove from shelf</button>` : ''}`;
  if (c.id === (openId || '')) updateSheetHead(c);
  shelf.paint && shelf.node(c.id)?.firstChild.setAttribute('aria-description', `${n} of ${t} lessons done`);
}
function updateSheetHead(c) { $('#sheet-title').textContent = c.title; $('#sheet-meta').textContent = `${doneCount(c)} / ${c.lessons.length} lessons`; }

article.addEventListener('click', (e) => {
  const b = e.target.closest('#done'); if (!b) return;
  const l = lessonById(S.data.current), c = courses.get(l.course);
  const on = !S.data.done[l.id];
  if (on) S.data.done[l.id] = 1; else delete S.data.done[l.id];
  S.save();
  b.classList.toggle('is-done', on); b.setAttribute('aria-pressed', String(on)); b.querySelector('span').textContent = on ? 'Completed' : 'Mark as complete';
  updateTree(); updateProgress(c);
  const a = $(`#tree .ls[data-id="${CSS.escape(l.id)}"]`); if (a && on) { a.classList.remove('just-done'); void a.offsetWidth; a.classList.add('just-done'); }
  say(on ? `${l.title} completed. ${doneCount(c)} of ${c.lessons.length} done.` : `${l.title} marked as not complete.`);
});

/* ------------------------------------------------------------------ routing */
function parseHash() {
  const m = location.hash.match(/^#\/([a-z0-9-]+)\/([a-z0-9-]+)$/i);
  return m ? `${m[1]}/${m[2]}` : null;
}
let first = true;
async function route() {
  let l = lessonById(parseHash() || '') || lessonById(S.data.current) || courses.get('layout').lessons[4];
  if (!parseHash()) history.replaceState(null, '', `#/${l.id}`);
  const animate = !first; first = false;
  const changedLesson = S.data.current !== l.id || !article.firstChild;
  S.data.current = l.id; S.data.last[l.course] = l.id; S.data.closed = false; S.save();
  if (openId !== l.course) {
    // open the book first, the lesson one frame later: no frame carries both jobs
    switchTo(l.course, animate);
    updateTree(); updateMover();
    if (animate) { await raf(); await raf(); } // the tree lays out in its own frame before the lesson is written
  } else { updateTree(); updateMover(); }
  if (changedLesson) { if (animate) $('#lesson').scrollTop = 0; renderLesson(l, !animate); }
  else updateProgress(courses.get(l.course), false);
  document.title = `${l.title} · ${courses.get(l.course).title} · Library`;
}
addEventListener('hashchange', route);

function pickCourse(id) {
  if (id === openId && layout !== 'phone') { closeTome(); S.data.closed = true; S.save(); say(`${courses.get(id).title} closed`); return; }
  if (id === openId && layout === 'phone') { sheet.set('half'); return; }
  const c = courses.get(id), l = resumeLesson(c);
  if (layout === 'phone') setTimeout(() => sheet.set('half'), 30);
  if (location.hash === `#/${l.id}`) { switchTo(id, true); updateTree(); updateMover(); }
  else location.hash = `#/${l.id}`;
  say(`${c.title} opened. ${doneCount(c)} of ${c.lessons.length} lessons done.`);
}

/* ------------------------------------------------------------------ mover (single-pointer alternative to dragging) */
function updateMover() {
  const id = openId || S.data.current.split('/')[0], i = shelf.order.indexOf(id);
  $('#mover-label').textContent = `${courses.get(id)?.title || ''} · ${i + 1} of ${shelf.order.length}`;
  $('#move-prev').disabled = i <= 0; $('#move-next').disabled = i >= shelf.order.length - 1;
}
for (const [sel, d] of [['#move-prev', -1], ['#move-next', 1]]) {
  $(sel).addEventListener('click', () => {
    const id = openId || S.data.current.split('/')[0];
    if (shelf.move(id, d)) { updateMover(); say(`${courses.get(id).title} moved to position ${shelf.order.indexOf(id) + 1} of ${shelf.order.length}`); }
    requestAnimationFrame(() => setThickness(id));
  });
}

/* ------------------------------------------------------------------ search */
let sayT = 0;
function runSearch(raw) {
  query = raw.trim();
  $('#q-clear').hidden = !query;
  if (!query) { shelf.setFilter(null); $('#search-count').textContent = ''; updateTree(); return; }
  const q = query.toLowerCase(), hits = new Set();
  for (const c of courses.values()) {
    if (c.title.toLowerCase().includes(q) || c.lessons.some((l) => l.title.toLowerCase().includes(q) || l.lead.toLowerCase().includes(q) || l.body.some((p) => p.toLowerCase().includes(q)))) hits.add(c.id);
  }
  shelf.setFilter(hits);
  updateTree();
  const msg = hits.size ? `${hits.size} ${hits.size === 1 ? 'course matches' : 'courses match'} “${query}”` : `No course matches “${query}”`;
  $('#search-count').textContent = msg;
  clearTimeout(sayT); sayT = setTimeout(() => say(msg), 450);
  return hits;
}
const q = $('#q');
q.addEventListener('input', () => runSearch(q.value));
q.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (q.value) { q.value = ''; runSearch(''); e.stopPropagation(); } else if (layout === 'phone') searchOpen(false); }
  if (e.key === 'Enter') {
    e.preventDefault(); const hits = runSearch(q.value); if (!hits || !hits.size) return;
    const id = shelf.order.find((k) => hits.has(k)), c = courses.get(id), ql = query.toLowerCase();
    const l = c.lessons.find((x) => x.title.toLowerCase().includes(ql)) || c.lessons.find((x) => x.lead.toLowerCase().includes(ql) || x.body.some((p) => p.toLowerCase().includes(ql))) || resumeLesson(c);
    location.hash = `#/${l.id}`;
    if (layout === 'phone') setTimeout(() => sheet.set('half'), 30);
  }
});
$('#q-clear').addEventListener('click', () => { q.value = ''; runSearch(''); q.focus(); });
function searchOpen(on) {
  $('#search-row').hidden = layout === 'phone' && !on;
  $('#search-toggle').setAttribute('aria-expanded', String(!!on));
  if (on && layout === 'phone') q.focus();
}
$('#search-toggle').addEventListener('click', () => searchOpen($('#search-row').hidden));

/* ------------------------------------------------------------------ add / remove a course */
const pop = $('#pop'), popName = $('#pop-name');
let adding = null;
function addCourse() {
  if (adding) { popName.focus(); return; }
  if (shelf.order.length >= 14) { toast('The shelf is full. Remove a course to add another.'); return; }
  const used = new Set([...courses.values()].map((c) => c.color));
  const color = CLOTH.find((c) => !used.has(c)) || CLOTH[shelf.order.length % CLOTH.length];
  const id = 'c-' + Date.now().toString(36);
  const c = prepare(starterCourse(id, 'New course', color));
  adding = c;
  shelf.add(c, layout === 'desk' ? 'right' : 'right');
  popName.value = '';
  pop.hidden = false;
  placePop(id);
  setTimeout(() => placePop(id), 680);
  popName.focus();
  say('New course added to the shelf. Type its title.');
}
function placePop(id) {
  if (pop.hidden) return;
  const r = shelf.node(id)?.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x, y;
  if (!r || layout === 'phone') { x = (innerWidth - pw) / 2; y = Math.min(innerHeight * 0.3, innerHeight - ph - 20); }
  else { x = r.right + 14; y = r.top + r.height / 2 - ph / 2; if (x + pw > innerWidth - 12) x = r.left - pw - 14; }
  pop.style.transform = `translate3d(${Math.round(clamp(x, 12, innerWidth - pw - 12))}px, ${Math.round(clamp(y, 12, innerHeight - ph - 12))}px, 0)`;
}
popName.addEventListener('input', () => {
  if (!adding) return;
  const t = popName.value.trim() || 'New course';
  adding.title = t; adding.abbr = t.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'N';
  shelf.paint(adding.id);
});
$('#pop-form').addEventListener('submit', (e) => {
  e.preventDefault(); if (!adding) return;
  const t = popName.value.trim(); if (!t) { popName.focus(); return; }
  const c = adding; adding = null; pop.hidden = true;
  c.title = t; shelf.paint(c.id);
  S.data.custom.push({ id: c.id, title: c.title, color: c.color }); S.data.order = [...shelf.order]; S.save();
  say(`${c.title} is on the shelf.`);
  location.hash = `#/${c.lessons[0].id}`;
});
function cancelAdd() {
  if (!adding) return; const id = adding.id; adding = null; pop.hidden = true; shelf.remove(id); $('#add').focus(); say('New course discarded.');
}
$('#pop-cancel').addEventListener('click', cancelAdd);
pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); cancelAdd(); } });
$('#add').addEventListener('click', addCourse);
$('#add-top').addEventListener('click', addCourse);

document.addEventListener('click', (e) => {
  if (!e.target.closest?.('#remove-course')) return;
  const id = openId; const c = courses.get(id); if (!c || !c.custom) return;
  const idx = shelf.order.indexOf(id), saved = { ...S.data.custom.find((x) => x.id === id) };
  closeTome(false);
  shelf.remove(id);
  S.data.custom = S.data.custom.filter((x) => x.id !== id); S.data.order = [...shelf.order]; S.save();
  const other = courses.get(shelf.order[Math.max(0, idx - 1)]);
  location.hash = `#/${resumeLesson(other).id}`;
  toast(`${c.title} removed`, { label: 'Undo', run: () => {
    const back = prepare(starterCourse(saved.id, saved.title, saved.color));
    shelf.add(back); shelf.move(back.id, idx - shelf.order.indexOf(back.id));
    S.data.custom.push(saved); S.data.order = [...shelf.order]; S.save(); location.hash = `#/${back.lessons[0].id}`;
  } });
});

/* ------------------------------------------------------------------ rail, theme */
$('#rail').addEventListener('click', () => { S.data.rail = !S.data.rail; S.save(true); applyLayout(); say(S.data.rail ? 'Shelf collapsed to a rail' : 'Shelf expanded'); });
function setTheme(t, persist = true) {
  document.documentElement.dataset.theme = t;
  const dark = t === 'dark';
  $('#theme').innerHTML = icon(dark ? 'sun' : 'lamp');
  $('#theme').setAttribute('aria-pressed', String(dark));
  $('#theme').setAttribute('aria-label', dark ? 'Daylight theme' : 'Evening lamp theme');
  if (persist) try { localStorage.setItem('shelf.library.theme', t); } catch (e) {}
}
$('#theme').addEventListener('click', () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); say(document.documentElement.dataset.theme === 'dark' ? 'Evening lamp on' : 'Daylight'); });

/* ------------------------------------------------------------------ phone sheet */
const sheet = new Sheet($('#sheet'), {
  handle: $('#sheet-handle'), grip: $('#sheet-grip'),
  snaps: () => ({ peek: 74, half: Math.round(innerHeight * 0.52), full: Math.round(innerHeight - 64) }),
  label: (s) => `Chapters, ${s === 'peek' ? 'lowered' : s === 'half' ? 'half open' : 'open'}. Press to ${s === 'full' ? 'lower' : 'raise'}.`,
  onSnap: (s) => { $('#sheet-x').hidden = s === 'peek'; $('#sheet-body').inert = s === 'peek'; },
});
$('#sheet-x').addEventListener('click', () => { sheet.set('peek'); $('#sheet-grip').focus(); });

/* ------------------------------------------------------------------ icons + boot */
$('#search-toggle').innerHTML = icon('search');
$('#rail').innerHTML = icon('sidebar');
$('#add-top').innerHTML = icon('plus');
$('#q-clear').innerHTML = icon('x');
$('#move-prev').innerHTML = icon('chevL');
$('#move-next').innerHTML = icon('chevR');
$('#sheet-x').innerHTML = icon('x');
document.querySelector('.search__i').innerHTML = icon('search');
document.querySelector('.add__i').innerHTML = icon('plus');
document.querySelector('.tome__more').innerHTML = icon('chevD');
setTheme(document.documentElement.dataset.theme || 'light', false);

let readyResolve; const ready = new Promise((r) => (readyResolve = r));
(async () => {
  layout = '';
  applyLayout(true);
  shelf.layout(false);
  const wasClosed = S.data.closed;   // route() opens the current course and clears the flag: read it first
  await route();
  if (wasClosed && layout !== 'phone') { closeTome(false); S.data.closed = true; S.save(); }
  if (document.fonts) await document.fonts.ready;
  shelf.layout(false); sizeTome();
  if (layout === 'phone') sheet.set('half', false);
  await raf(); await raf();
  document.body.classList.add('is-ready');
  readyResolve();
  // warm-up: run the first-open code paths once on detached nodes, so the first real tap does not pay for compiling them
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
  idle(() => {
    const tmp = document.createElement('div');
    for (const c of courses.values()) { tmp.innerHTML = treeHTML(c); art(c.art, 1, c.title); }
    const l = courses.get('color').lessons[3]; tmp.innerHTML = `${art('color', l.n, l.title)}<p>${esc(l.lead)}</p>${markText(l.title, 'to')}`;
    markFit(tmp); tmp.remove();
  });
})();

/* ------------------------------------------------------------------ test hook */
window.__shelf = {
  ready, shelf, sheet,
  state: () => ({ layout, open: openId, current: S.data.current, order: [...shelf.order], done: Object.keys(S.data.done).length, query, rail: S.data.rail,
    theme: document.documentElement.dataset.theme, sheet: sheet.state, custom: S.data.custom.length, adding: !!adding }),
  progress: (cid) => { const c = courses.get(cid); return { done: doneCount(c), total: c.lessons.length }; },
  search: (s) => { q.value = s; runSearch(s); },
  open: (id) => pickCourse(id),
  courses: () => [...courses.values()].map((c) => ({ id: c.id, title: c.title, lessons: c.lessons.length })),
};
