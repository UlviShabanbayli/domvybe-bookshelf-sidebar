// SHELF · Nordic: a notes app whose sidebar is a light-oak floating shelf. The active notebook slides out of the row;
// its notes list beside it; the note is editable and saved to localStorage.
import { Shelf } from '../shared/shelf.js';
import { Sheet } from '../shared/sheet.js';
import { store, announcer, toaster, icon, esc, markText, hash01, clamp, reducedMotion, raf, markFit } from '../shared/util.js';
import { NOTEBOOKS, PASTELS, ICONS } from './data.js';

const $ = (s) => document.querySelector(s);
const app = $('#app'), scene = $('#scene');
const say = announcer($('#live')), toast = toaster($('#toast'));
const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/* ------------------------------------------------------------------ state */
const S = store('shelf.nordic.v1', {
  books: NOTEBOOKS.map(({ notes, ...b }) => b),
  notes: Object.fromEntries(NOTEBOOKS.map((b) => [b.id, b.notes])),
  order: NOTEBOOKS.map((b) => b.id), current: 'work/project-alpha', last: {}, rail: false,
});
const books = new Map(S.data.books.map((b) => [b.id, b]));
S.data.order = S.data.order.filter((id) => books.has(id));
for (const id of books.keys()) if (!S.data.order.includes(id)) S.data.order.push(id);
const notesOf = (id) => (S.data.notes[id] ||= []);
const findNote = (key) => { const [b, n] = (key || '').split('/'); return books.has(b) ? notesOf(b).find((x) => x.id === n) || null : null; };
const persistBooks = () => { S.data.books = S.data.order.map((id) => books.get(id)); S.save(); };

/* ------------------------------------------------------------------ shelf */
const face = (b) => `
  <span class="book__spine" style="--len:${Math.max(4, b.title.length)}">
    <span class="book__title">${esc(b.title)}</span>
    <span class="book__icon">${icon(b.icon || 'doc')}</span>
    <span class="book__dim"></span>
  </span>
  <span class="book__cover"></span><span class="book__back"></span><span class="book__top"></span>`;
const addFace = () => `<span class="book__spine book__spine--add" style="--len:12"><span class="book__title">Add notebook</span><span class="book__icon">${icon('plus')}</span></span>`;

function configs(mode, W, H, n) {
  if (mode === 'rail') return [{ key: `rail${W}`, rows: [{ mode: 'column', x: 0, top: 6, w: W, h: Infinity, gap: 8 }], unit: { w: 30, h: W - 12 },
    extent: { h: (pos) => Math.max(...[...pos.values()].map((p) => p.y)) + 14 } }];
  if (mode === 'strip') return [{ key: `strip${H}`, rows: [{ mode: 'upright', x: 16, base: H - 18, w: Infinity, h: H, gap: 3 }], unit: { w: H / 4.6, h: H - 36 },
    extent: { w: (pos) => Math.max(...[...pos.values()].map((p) => p.x + p.w)) + 20 } }];
  // like the concept, the floating shelf runs past the wall: books fill the wall, the bookend and plant stand beyond it
  // six notebooks fill the wall; the add spine, bookend and plant stand on the part of the shelf that runs past it
  const base = Math.round(H - Math.max(70, H * 0.17)), top = 4, x0 = 40, rowW = W - x0 - 6;
  const u = Math.min(92, (W - x0 - 12) / 6.9);    // six notebooks + the add spine fit on the wall; nothing tall reaches the notes list
  const one = (k) => ({ key: `one${W}x${H}k${k}`, rows: [{ mode: 'upright', x: x0, base, w: rowW, h: base - top, gap: 3 }], boards: [base],
    unit: { w: u * k, h: Math.min(base - top, u * 9.6) } });
  // a second floating shelf appears above when one row is full: the bottom keeps half, the new shelf takes the rest
  const two = (k) => {
    const rowH = (base - top) / 2, b0 = Math.round(base - rowH), half = Math.ceil(n / 2);
    return { key: `two${W}x${H}n${n}k${k}`, rows: [{ mode: 'upright', x: x0, base, w: rowW, h: rowH - 26, gap: 3, max: half }, { mode: 'upright', x: x0, base: b0, w: rowW, h: rowH - 30, gap: 3 }],
      boards: [base, b0], unit: { w: Math.min(u, (W - x0) / (half + 0.4), (rowH - 40) / 5.4) * k, h: rowH - 40 } };
  };
  return [one(1), one(0.92), one(0.84), two(1), two(0.88), two(0.76), two(0.64)];
}
const coarse = matchMedia('(pointer: coarse)');
function dims(b, cfg, mode) {
  if (b.trailing) return mode === 'rail' ? { w: coarse.matches ? 44 : 26, h: cfg.unit.h } : { w: Math.max(coarse.matches ? 44 : 0, Math.round(cfg.unit.w * 0.62)), h: Math.round(cfg.unit.h * 0.7) };
  const h = Math.round(cfg.unit.h * (b.hf || 0.82 + hash01(b.id, 1) * 0.14)), w = Math.round(cfg.unit.w * (b.tf || 0.94 + hash01(b.id, 2) * 0.12));
  if (mode === 'rail') return { w: coarse.matches ? 44 : clamp(Math.round(cfg.unit.w * (b.tf || 1)), 24, 36), h: cfg.unit.h };
  if (mode === 'strip') return { w: Math.max(coarse.matches ? 44 : 0, w), h: Math.round(cfg.unit.h * (0.8 + ((b.hf || 0.88) - 0.7) * 0.8)) };
  return { w: Math.max(coarse.matches ? 44 : 0, w), h };
}

const bookend = $('#bookend'), plant = $('#plant'), upright = $('#upright');
let boardsKey = '';
function afterLayout(pos, cfg, mode) {
  const desk = mode === 'desk';
  if (!desk) { scene.querySelectorAll('.board').forEach((e) => e.remove()); boardsKey = ''; }
  else if (cfg.key !== boardsKey) {
    boardsKey = cfg.key; scene.querySelectorAll('.board').forEach((e) => e.remove());
    cfg.boards.forEach((y, i) => {
      const d = document.createElement('div'); d.className = 'board' + (i ? ' board--upper' : ''); d.setAttribute('aria-hidden', 'true');
      d.style.transform = `translate3d(0, ${y}px, 0)`;
      scene.prepend(d);
    });
  }
  // the bookend leans against the last book on the bottom shelf, the plant stands after it
  let end = 0;
  for (const [, p] of pos) if (p.row === 0) end = Math.max(end, p.x + p.w);
  if (desk) {
    const base = cfg.rows[0].base, bw = bookend.offsetWidth, pw = plant.offsetWidth;
    const uh = Math.round(cfg.unit.h * 0.94); upright.style.height = uh + 'px';
    upright.style.transform = `translate3d(6px, ${base - uh}px, 0)`;
    bookend.style.transform = `translate3d(${end + 3}px, ${base - bookend.offsetHeight + 2}px, 0)`;
    const px = end + bw + 18;
    plant.style.transform = `translate3d(${px}px, ${base - plant.offsetHeight + 6}px, 0)`;
    const lower = scene.querySelector('.board:not(.board--upper)'); if (lower) lower.style.width = Math.round(px + pw + 26) + 'px';
  }
}

const shelf = new Shelf(scene, {
  afterPaint: (li) => markFit(li),
  items: books, order: S.data.order, face, dims, configs, afterLayout,
  listLabel: 'Notebooks', controls: 'notes',
  trailing: { id: '__add', face: addFace, label: 'Add notebook' },
  label: (b) => b.title,
  describe: (b) => `${notesOf(b.id).length} notes`,
  announce: say,
  onSelect: (id) => pickBook(id),
  onTrailing: () => addNotebook(),
  onReorder: (order) => { S.data.order = [...order]; persistBooks(); updateMover(); },
});
shelf.ul.setAttribute('aria-describedby', 'shelf-help');

/* ------------------------------------------------------------------ layout */
let layout = '';
const decide = () => (innerWidth < 720 ? 'phone' : innerWidth < 1000 || innerHeight < 560 || S.data.rail ? 'rail' : 'desk');
const forcedRail = () => innerWidth < 1000 || innerHeight < 560;
function applyLayout(force = false) {
  const next = decide();
  if (next === layout && !force) return;
  layout = next; app.dataset.layout = next;
  $('#rail').hidden = next === 'phone' || forcedRail();
  $('#rail').setAttribute('aria-pressed', String(next === 'rail'));
  $('#rail').setAttribute('aria-label', next === 'rail' ? 'Expand the shelf' : 'Collapse shelf to a rail');
  shelf.setMode(next === 'phone' ? 'strip' : next === 'rail' ? 'rail' : 'desk');
  const host = next === 'phone' ? $('#sheet-body') : $('.list');
  if (next === 'phone') { host.append($('#nb-name'), $('#notes-host')); }
  else { $('.list').append($('#nb-name'), $('#notes-host')); }
  sheet.enable(next === 'phone');
  requestAnimationFrame(() => markFit());
  $('#search-row').hidden = next !== 'desk' && !$('#q').value;
}
new ResizeObserver(() => { shelf.layout(false); applyLayout(); }).observe(scene);
addEventListener('resize', () => applyLayout());

/* ------------------------------------------------------------------ notebook + notes list */
let openId = null, query = '';
function renderNotes() {
  const b = books.get(openId); if (!b) return;
  const list = notesOf(b.id), q = query.toLowerCase(), cur = S.data.current;
  $('#nb-name').value = b.title;
  $('#notes').innerHTML = list.map((n) => {
    const hit = q && (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    return `<li class="${q ? (hit ? 'is-hit' : 'is-miss') : ''}"><a class="nl" href="#/${b.id}/${n.id}" data-id="${n.id}"${`${b.id}/${n.id}` === cur ? ' aria-current="page"' : ''}><span class="nl__t">${q ? markText(n.title || 'Untitled', query) : esc(n.title || 'Untitled')}</span></a></li>`;
  }).join('') || `<li class="nl-empty">No notes yet</li>`;
  markFit($('#notes'));
  $('#sheet-title').textContent = b.title;
  $('#sheet-meta').textContent = `${list.length} ${list.length === 1 ? 'note' : 'notes'}`;
  shelf.node(b.id)?.firstChild.setAttribute('aria-description', `${list.length} notes`);
}
function markCurrent() {
  for (const a of document.querySelectorAll('#notes .nl')) { if (`${openId}/${a.dataset.id}` === S.data.current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
}
function setTitleInList(n) { const a = document.querySelector(`#notes .nl[data-id="${CSS.escape(n.id)}"] .nl__t`); if (a) a.textContent = n.title || 'Untitled'; }

/* ------------------------------------------------------------------ editor */
const edTitle = $('#ed-title'), edBody = $('#ed-body');
let editing = null, saveT = 0;
function fitTitle() { edTitle.style.height = 'auto'; edTitle.style.height = edTitle.scrollHeight + 'px'; }
function showNote(n) {
  editing = n;
  $('#note').hidden = !n; $('#note-empty').hidden = !!n;
  for (const id of ['#edit', '#del', '#more']) $(id).disabled = !n;
  if (!n) return;
  edTitle.value = n.title; edBody.value = n.body;
  $('#ed-date').textContent = `Edited ${fmt.format(new Date(n.edited))}`;
  $('#ed-saved').classList.remove('on');
  requestAnimationFrame(fitTitle);
}
function touched() {
  if (!editing) return;
  editing.edited = new Date().toISOString().slice(0, 19);
  $('#ed-date').textContent = `Edited ${fmt.format(new Date(editing.edited))}`;
  clearTimeout(saveT);
  saveT = setTimeout(() => { S.save(true); const s = $('#ed-saved'); s.classList.remove('on'); void s.offsetWidth; s.classList.add('on'); }, 350);
}
edTitle.addEventListener('input', () => { editing.title = edTitle.value.replace(/\n/g, ' '); if (edTitle.value.includes('\n')) edTitle.value = editing.title; fitTitle(); setTitleInList(editing); touched(); });
edTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); edBody.focus(); edBody.setSelectionRange(0, 0); } });
edBody.addEventListener('input', () => { editing.body = edBody.value; touched(); });

/* ------------------------------------------------------------------ routing */
const parse = () => { const m = location.hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?$/); return m ? [m[1], m[2] || null] : [null, null]; };
let first = true;
function route() {
  let [bid, nid] = parse();
  if (!books.has(bid)) { [bid, nid] = S.data.current.split('/'); if (!books.has(bid)) bid = shelf.order[0]; }
  const list = notesOf(bid);
  let n = list.find((x) => x.id === nid) || null;
  if (!n && nid !== 'new') n = findNote(S.data.last[bid] ? `${bid}/${S.data.last[bid]}` : '') || list[0] || null;
  const key = n ? `${bid}/${n.id}` : bid;
  if (location.hash !== `#/${key}`) history.replaceState(null, '', `#/${key}`);
  const changedBook = openId !== bid;
  openId = bid; S.data.current = n ? key : `${bid}/`; if (n) S.data.last[bid] = n.id; S.save();
  shelf.select(bid);
  if (changedBook) renderNotes(); else markCurrent();
  if (!editing || editing !== n || changedBook) showNote(n);
  updateMover();
  if (!first && layout === 'phone' && n) sheet.set('peek');
  first = false;
  document.title = `${n ? (n.title || 'Untitled') + ' · ' : ''}${books.get(bid).title} · Notebooks`;
}
addEventListener('hashchange', route);
function pickBook(id) {
  if (id === openId) { if (layout === 'phone') sheet.set('half'); return; }
  const n = findNote(`${id}/${S.data.last[id] || ''}`) || notesOf(id)[0];
  location.hash = n ? `#/${id}/${n.id}` : `#/${id}`;
  if (layout === 'phone') setTimeout(() => sheet.set('half'), 30);
  say(`${books.get(id).title} opened. ${notesOf(id).length} notes.`);
}

/* ------------------------------------------------------------------ actions */
function newNote() {
  const n = { id: 'n' + Date.now().toString(36), title: '', body: '', edited: new Date().toISOString().slice(0, 19) };
  notesOf(openId).unshift(n); S.save(true);
  renderNotes();
  location.hash = `#/${openId}/${n.id}`;
  route();
  if (layout === 'phone') sheet.set('peek');
  requestAnimationFrame(() => edTitle.focus());
  say('New note. Type a title.');
}
$('#new-note').addEventListener('click', newNote);
$('#fab').addEventListener('click', newNote);
$('#empty-new').addEventListener('click', newNote);

function deleteNote() {
  if (!editing) return;
  const list = notesOf(openId), i = list.indexOf(editing), gone = editing, bid = openId;
  list.splice(i, 1); S.save(true);
  renderNotes();
  const next = list[Math.min(i, list.length - 1)];
  editing = null;
  location.hash = next ? `#/${bid}/${next.id}` : `#/${bid}/new`;
  toast(`“${gone.title || 'Untitled'}” deleted`, { label: 'Undo', run: () => { notesOf(bid).splice(i, 0, gone); S.save(true); renderNotes(); location.hash = `#/${bid}/${gone.id}`; say('Note restored'); } });
  say('Note deleted. Undo is available.');
}
$('#del').addEventListener('click', deleteNote);
$('#edit').addEventListener('click', () => { edTitle.focus(); edTitle.setSelectionRange(edTitle.value.length, edTitle.value.length); });
$('#back').addEventListener('click', () => {
  if (layout === 'phone') { sheet.set('half'); $('#sheet-grip').focus(); return; }
  const a = document.querySelector('#notes .nl[aria-current]') || document.querySelector('#notes .nl'); a?.focus();
});

/* more menu: duplicate, move to another notebook, delete */
const menu = $('#menu'), more = $('#more');
function openMenu() {
  const others = shelf.order.filter((id) => id !== openId);
  menu.innerHTML = `<li role="none"><button role="menuitem" type="button" data-act="dup" tabindex="-1">${icon('copy')}Duplicate note</button></li>
    <li role="separator" class="menu__sep"></li><li role="presentation" class="menu__h">Move to</li>
    ${others.map((id) => `<li role="none"><button role="menuitem" type="button" data-move="${id}" tabindex="-1"><i class="menu__dot" style="--c:${books.get(id).color}"></i>${esc(books.get(id).title)}</button></li>`).join('')}
    <li role="separator" class="menu__sep"></li><li role="none"><button role="menuitem" type="button" data-act="del" class="is-danger" tabindex="-1">${icon('trash')}Delete note</button></li>`;
  menu.hidden = false; more.setAttribute('aria-expanded', 'true');
  menu.querySelector('[role=menuitem]').focus();
}
function closeMenu(focus = true) { if (menu.hidden) return; menu.hidden = true; more.setAttribute('aria-expanded', 'false'); if (focus) more.focus(); }
more.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
menu.addEventListener('keydown', (e) => {
  const items = [...menu.querySelectorAll('[role=menuitem]')], i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
  else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closeMenu(); }
});
menu.addEventListener('click', (e) => {
  const b = e.target.closest('[role=menuitem]'); if (!b || !editing) return;
  closeMenu(false);
  if (b.dataset.act === 'del') return deleteNote();
  if (b.dataset.act === 'dup') {
    const n = { ...editing, id: 'n' + Date.now().toString(36), title: (editing.title || 'Untitled') + ' (copy)', edited: new Date().toISOString().slice(0, 19) };
    const list = notesOf(openId); list.splice(list.indexOf(editing) + 1, 0, n); S.save(true); renderNotes(); location.hash = `#/${openId}/${n.id}`; say('Note duplicated'); return;
  }
  if (b.dataset.move) {
    const to = b.dataset.move, list = notesOf(openId), n = editing;
    list.splice(list.indexOf(n), 1); notesOf(to).unshift(n); S.save(true);
    renderNotes();
    location.hash = `#/${to}/${n.id}`;
    say(`Moved to ${books.get(to).title}`); toast(`Moved to ${books.get(to).title}`);
  }
});
document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== more && !more.contains(e.target)) closeMenu(false); });

/* rename the notebook from the list header */
$('#nb-name').addEventListener('input', (e) => { const b = books.get(openId); b.title = e.target.value.trim() || 'Untitled'; shelf.paint(b.id); $('#sheet-title').textContent = b.title; persistBooks(); updateMover(); });
$('#nb-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

/* mover: the single-pointer alternative to dragging */
function updateMover() {
  const i = shelf.order.indexOf(openId);
  const t = books.get(openId)?.title || '';
  $('#mover-label').textContent = `${t} · ${i + 1} of ${shelf.order.length}`;
  $('#move-prev').setAttribute('aria-label', `Move ${t} left on the shelf (now ${i + 1} of ${shelf.order.length})`);
  $('#move-next').setAttribute('aria-label', `Move ${t} right on the shelf (now ${i + 1} of ${shelf.order.length})`);
  $('#move-prev').disabled = i <= 0; $('#move-next').disabled = i >= shelf.order.length - 1;
}
for (const [sel, dlt] of [['#move-prev', -1], ['#move-next', 1]]) $(sel).addEventListener('click', () => {
  if (shelf.move(openId, dlt)) { updateMover(); say(`${books.get(openId).title} moved to position ${shelf.order.indexOf(openId) + 1} of ${shelf.order.length}`); }
});

/* ------------------------------------------------------------------ search */
let sayT = 0;
function runSearch(raw) {
  query = raw.trim(); $('#q-clear').hidden = !query;
  if (!query) { shelf.setFilter(null); $('#search-count').textContent = ''; renderNotes(); return null; }
  const q = query.toLowerCase(), hits = new Set();
  for (const id of shelf.order) {
    const b = books.get(id);
    if (b.title.toLowerCase().includes(q) || notesOf(id).some((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))) hits.add(id);
  }
  shelf.setFilter(hits); renderNotes();
  const msg = hits.size ? `${hits.size} ${hits.size === 1 ? 'notebook matches' : 'notebooks match'} “${query}”` : `No notebook matches “${query}”`;
  $('#search-count').textContent = msg; clearTimeout(sayT); sayT = setTimeout(() => say(msg), 450);
  return hits;
}
const q = $('#q');
q.addEventListener('input', () => runSearch(q.value));
q.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (q.value) { q.value = ''; runSearch(''); e.stopPropagation(); } else if (layout !== 'desk') { toggleSearch(false); $('#search-toggle').focus(); } }
  if (e.key === 'Enter') {
    e.preventDefault(); const hits = runSearch(q.value); if (!hits || !hits.size) return;
    const id = shelf.order.find((k) => hits.has(k)), ql = query.toLowerCase();
    const n = notesOf(id).find((x) => x.title.toLowerCase().includes(ql)) || notesOf(id).find((x) => x.body.toLowerCase().includes(ql)) || notesOf(id)[0];
    location.hash = n ? `#/${id}/${n.id}` : `#/${id}`;
  }
});
$('#q-clear').addEventListener('click', () => { q.value = ''; runSearch(''); q.focus(); });
function toggleSearch(on) { $('#search-row').hidden = layout !== 'desk' && !on; $('#search-toggle').setAttribute('aria-expanded', String(!!on)); if (on) q.focus(); }
$('#search-toggle').addEventListener('click', () => toggleSearch($('#search-row').hidden));

/* ------------------------------------------------------------------ new notebook */
const pop = $('#pop'), popName = $('#pop-name'), sw = $('#swatches');
let adding = null;
sw.innerHTML = PASTELS.map((p, i) => `<button type="button" role="radio" class="sw" style="--c:${p.c}" data-c="${p.c}" aria-label="${p.name}" aria-checked="false" tabindex="-1"></button>`).join('');
function pickSwatch(c, focus = false) {
  for (const b of sw.children) { const on = b.dataset.c === c; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); }
  if (adding) { adding.color = c; shelf.paint(adding.id); }
}
sw.addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (b) pickSwatch(b.dataset.c); });
sw.addEventListener('keydown', (e) => {
  const items = [...sw.children], i = items.findIndex((b) => b.getAttribute('aria-checked') === 'true');
  const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
  if (d) { e.preventDefault(); pickSwatch(items[(i + d + items.length) % items.length].dataset.c, true); }
});
function addNotebook() {
  if (adding) { popName.focus(); return; }
  if (shelf.order.length >= 12) { toast('The shelf is full. Twelve notebooks is the limit.'); return; }
  const used = new Set([...books.values()].map((b) => b.color));
  const color = (PASTELS.find((p) => !used.has(p.c)) || PASTELS[shelf.order.length % PASTELS.length]).c;
  const usedIcons = new Set([...books.values()].map((b) => b.icon));
  const id = 'nb' + Date.now().toString(36);
  adding = { id, title: 'New notebook', color, icon: ICONS.find((x) => !usedIcons.has(x)) || 'doc', hf: 0.8 + hash01(id) * 0.14, tf: 0.96, custom: true };
  S.data.notes[id] = [];
  shelf.add(adding, layout === 'desk' ? 'top' : 'right');
  popName.value = ''; pickSwatch(color);
  pop.hidden = false; placePop(); setTimeout(placePop, 700);
  popName.focus();
  say('New notebook on the shelf. Type its name and pick a colour.');
}
function placePop() {
  if (pop.hidden || !adding) return;
  const r = shelf.node(adding.id)?.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x, y;
  if (!r || layout === 'phone') { x = (innerWidth - pw) / 2; y = Math.min(innerHeight * 0.28, innerHeight - ph - 20); }
  else { x = r.right + 16; y = r.top + Math.min(40, r.height / 3); if (x + pw > innerWidth - 12) x = r.left - pw - 16; }
  pop.style.transform = `translate3d(${Math.round(clamp(x, 12, innerWidth - pw - 12))}px, ${Math.round(clamp(y, 12, innerHeight - ph - 12))}px, 0)`;
}
popName.addEventListener('input', () => { if (!adding) return; adding.title = popName.value.trim() || 'New notebook'; shelf.paint(adding.id); });
$('#pop-form').addEventListener('submit', (e) => {
  e.preventDefault(); if (!adding) return;
  const t = popName.value.trim(); if (!t) { popName.focus(); return; }
  const b = adding; adding = null; pop.hidden = true; b.title = t; shelf.paint(b.id);
  S.data.order = [...shelf.order]; persistBooks();
  say(`${b.title} is on the shelf.`);
  location.hash = `#/${b.id}/new`;
  setTimeout(() => { if (openId === b.id && !notesOf(b.id).length) newNote(); }, 60);
});
function cancelAdd() { if (!adding) return; const id = adding.id; adding = null; pop.hidden = true; delete S.data.notes[id]; shelf.remove(id); shelf.focus('__add'); say('New notebook discarded.'); }
$('#pop-cancel').addEventListener('click', cancelAdd);
pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); cancelAdd(); } });
$('#add-top').addEventListener('click', addNotebook);

/* ------------------------------------------------------------------ rail, theme, sheet */
$('#rail').addEventListener('click', () => { S.data.rail = !S.data.rail; S.save(true); applyLayout(); say(S.data.rail ? 'Shelf collapsed to a rail' : 'Shelf expanded'); });
function setTheme(t, persist = true) {
  document.documentElement.dataset.theme = t; const dark = t === 'dark';
  $('#theme').innerHTML = icon(dark ? 'sun' : 'moon'); $('#theme').setAttribute('aria-pressed', String(dark));
  $('#theme').setAttribute('aria-label', dark ? 'Light oak theme' : 'Dark walnut theme');
  if (persist) try { localStorage.setItem('shelf.nordic.theme', t); } catch (e) {}
}
$('#theme').addEventListener('click', () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); say(document.documentElement.dataset.theme === 'dark' ? 'Dark walnut' : 'Light oak'); });

const sheet = new Sheet($('#sheet'), {
  handle: $('#sheet-handle'), grip: $('#sheet-grip'),
  snaps: () => ({ peek: 74, half: Math.round(innerHeight * 0.5), full: Math.round(innerHeight - 64) }),
  label: (s) => `Notes, ${s === 'peek' ? 'lowered' : s === 'half' ? 'half open' : 'open'}. Press to ${s === 'full' ? 'lower' : 'raise'}.`,
  onSnap: (s) => { $('#sheet-x').hidden = s === 'peek'; $('#sheet-body').inert = s === 'peek'; },
});
$('#sheet-x').addEventListener('click', () => { sheet.set('peek'); $('#sheet-grip').focus(); });
$('#notes-host').addEventListener('click', (e) => { if (e.target.closest('.nl') && layout === 'phone') setTimeout(() => sheet.set('peek'), 60); });

/* ------------------------------------------------------------------ boot */
for (const [id, ic] of [['#search-toggle', 'search'], ['#add-top', 'plus'], ['#rail', 'sidebar'], ['#new-note', 'plus'], ['#q-clear', 'x'], ['#move-prev', 'chevL'], ['#move-next', 'chevR'], ['#edit', 'pencil'], ['#del', 'trash'], ['#more', 'more'], ['#sheet-x', 'x'], ['#fab', 'plus']]) $(id).innerHTML = icon(ic);
document.querySelector('.search__i').innerHTML = icon('search');
document.querySelector('.back__i').innerHTML = icon('chevL');
setTheme(document.documentElement.dataset.theme || 'light', false);

let readyResolve; const ready = new Promise((r) => (readyResolve = r));
(async () => {
  applyLayout(true); shelf.layout(false);
  route();
  if (document.fonts) await document.fonts.ready;
  shelf.layout(false);
  if (layout === 'phone') sheet.set('half', false);
  await raf(); await raf();
  document.body.classList.add('is-ready'); readyResolve();
})();

window.__notes = {
  ready, shelf, sheet,
  state: () => ({ layout, open: openId, current: S.data.current, order: [...shelf.order], query, rail: S.data.rail, theme: document.documentElement.dataset.theme,
    sheet: sheet.state, notes: notesOf(openId).length, title: editing?.title ?? null, body: editing?.body ?? null, adding: !!adding, books: shelf.order.length }),
  search: (s) => { q.value = s; runSearch(s); },
  open: (id) => pickBook(id),
  stored: () => { try { return JSON.parse(localStorage.getItem('shelf.nordic.v1')); } catch (e) { return null; } },
};
