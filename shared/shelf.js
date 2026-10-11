// SHELF: the shelf engine shared by both looks.
// Books are absolutely positioned <li> slots moved only with transforms (translate + rotate), so re-ordering, dragging,
// adding and switching between upright / lying / rail never lays out the page; the slots glide on CSS transitions.
// The look (faces, rows, sizes, boards) comes from the variant through the options object.
import { clamp, reducedMotion } from './util.js';

const DEG = Math.PI / 180;

export class Shelf {
  /**
   * @param {HTMLElement} scene  positioned element that holds the books (perspective lives here); scrolls in strip/rail modes
   * @param {object} o
   *   items: Map(id → item)       order: [id]
   *   face(item, mode) → HTML of the book's faces           label(item) → accessible name
   *   configs(mode, W, H, n) → [{ rows: [...], unit }]     tried in order until every book fits
   *   dims(item, cfg, mode) → { w, h }                        (w = thickness, h = height, px)
   *   trailing: { id, face(mode), label } | null              an "add" spine kept last, not draggable
   *   onSelect(id), onReorder(order, id), onTrailing(), afterLayout(pos, cfg, mode), announce(msg), describe(item) → string
   */
  constructor(scene, o) {
    this.scene = scene; this.o = o;
    this.ul = document.createElement('ul'); this.ul.className = 'books'; this.ul.setAttribute('role', 'list');
    if (o.listLabel) this.ul.setAttribute('aria-label', o.listLabel);
    scene.append(this.ul);
    this.order = [...o.order];
    this.nodes = new Map(); this.dim = new Map(); this.pos = new Map();
    this.mode = 'desk'; this.cfg = null; this.sel = null; this.filter = null; this.focusId = null;
    for (const id of this.order) this.make(id);
    if (o.trailing) this.make(o.trailing.id, true);
    this.bind();
  }

  get all() { return this.o.trailing ? [...this.order, this.o.trailing.id] : this.order; }
  node(id) { return this.nodes.get(id); }

  make(id, trailing = false) {
    const li = document.createElement('li'); li.className = 'slot' + (trailing ? ' slot--add' : ''); li.dataset.id = id;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'book'; b.dataset.id = id; b.tabIndex = -1;
    li.append(b); this.nodes.set(id, li); this.paint(id); this.ul.append(li);
    return li;
  }

  /** (re)draw a book's faces and label: after a rename, a colour change or a mode switch */
  paint(id) {
    const li = this.nodes.get(id); if (!li) return;
    const b = li.firstChild;
    const t = this.o.trailing && id === this.o.trailing.id;
    const item = t ? null : this.o.items.get(id);
    b.innerHTML = `<span class="book__lift">${t ? this.o.trailing.face(this.mode) : this.o.face(item, this.mode)}</span>`;
    b.setAttribute('aria-label', t ? this.o.trailing.label : this.o.label(item));
    if (!t) { b.setAttribute('aria-expanded', String(this.sel === id)); if (this.o.controls) b.setAttribute('aria-controls', this.o.controls); }
    if (item && item.color) li.style.setProperty('--c', item.color);
    if (item && this.o.describe) { const d = this.o.describe(item); if (d) b.setAttribute('aria-description', d); }
    this.o.afterPaint?.(li);
  }

  /* ---------------------------------------------------------------- layout */
  setMode(mode) {
    if (mode === this.mode && this.cfg) return;
    this.mode = mode; this.scene.dataset.mode = mode;
    for (const id of this.all) this.paint(id);
    this.layout(false);
  }

  size() { return { W: this.scene.clientWidth, H: this.scene.clientHeight }; }

  /** pick the first config where everything fits, size the books, place them */
  layout(animate = true) {
    const { W, H } = this.size(); if (!W || !H) return;
    const cfgs = this.o.configs(this.mode, W, H, this.all.length);
    let pos = null, cfg = null;
    for (const c of cfgs) {
      this.measure(c); pos = this.compute(this.all, c);
      if (pos) { cfg = c; break; }
    }
    if (!pos) { cfg = cfgs[cfgs.length - 1]; this.measure(cfg); pos = this.compute(this.all, cfg, true); }
    const cfgChanged = !this.cfg || this.cfg.key !== cfg.key;
    this.cfg = cfg;
    if (!animate || reducedMotion()) this.ul.classList.add('no-anim');
    for (const id of this.all) {
      const li = this.nodes.get(id), d = this.dim.get(id);
      if (li._w !== d.w || li._h !== d.h) { li._w = d.w; li._h = d.h; li.style.width = d.w + 'px'; li.style.height = d.h + 'px'; }
    }
    this.apply(pos);
    if (cfg.extent) { this.ul.style.width = cfg.extent.w ? cfg.extent.w(pos, this) + 'px' : ''; this.ul.style.height = cfg.extent.h ? cfg.extent.h(pos, this) + 'px' : ''; }
    else { this.ul.style.width = ''; this.ul.style.height = ''; }
    if (this.o.afterLayout) this.o.afterLayout(pos, cfg, this.mode, cfgChanged);
    if (!animate || reducedMotion()) { void this.ul.offsetWidth; requestAnimationFrame(() => this.ul.classList.remove('no-anim')); }
  }

  measure(cfg) {
    for (const id of this.all) {
      const t = this.o.trailing && id === this.o.trailing.id;
      this.dim.set(id, this.o.dims(t ? { id, trailing: true } : this.o.items.get(id), cfg, this.mode));
    }
  }

  /** where every id goes, in this order; null if something does not fit (unless force) */
  compute(order, cfg, force = false) {
    const rows = cfg.rows, st = rows.map((R) => ({ x: R.x, stack: 0, n: 0, last: null }));
    const pos = new Map(); let ri = 0;
    for (const id of order) {
      const d = this.dim.get(id);
      for (;;) {
        if (ri >= rows.length) { if (!force) return null; ri = rows.length - 1; st[ri].n = 0; }
        const R = rows[ri], s = st[ri];
        const full = R.max && s.n >= R.max;
        if (R.mode === 'upright') {
          if (!full && (s.n === 0 || s.x + d.w <= R.x + R.w + 0.5 || force)) {
            pos.set(id, { x: s.x, y: R.base - d.h, rot: 0, w: d.w, h: d.h, row: ri });
            s.x += d.w + (R.gap ?? 1.5); s.n++; s.last = id; break;
          }
        } else if (R.mode === 'flat') {          // lying, stacked upwards from the board; long side along the row
          if (!full && s.stack + d.w <= R.h + 0.5 && d.h <= R.w + 2) {
            const jx = R.jitter ? (R.jitter(id, s.n)) : 0;
            pos.set(id, { x: R.x + jx, y: R.base - s.stack, rot: -90, w: d.w, h: d.h, row: ri });
            s.stack += d.w + (R.gap ?? 0.5); s.n++; break;
          }
        } else if (R.mode === 'column') {        // rail: lying, stacked downwards
          if (!full && (s.stack + d.w <= R.h + 0.5 || force)) {
            pos.set(id, { x: R.x + (R.w - d.h) / 2, y: R.top + s.stack + d.w, rot: -90, w: d.w, h: d.h, row: ri });
            s.stack += d.w + (R.gap ?? 6); s.n++; break;
          }
        }
        ri++;
      }
    }
    // a lying stack reads top-down: the first book lies on top
    rows.forEach((R, i) => {
      if (R.mode !== 'flat') return;
      const ids = [...pos.entries()].filter(([, p]) => p.row === i).map(([k]) => k);
      const ws = ids.map((k) => pos.get(k).w);
      let y = R.base; for (let j = ids.length - 1; j >= 0; j--) { pos.get(ids[j]).y = y; y -= ws[j] + (R.gap ?? 0.5); }
    });
    // the last book of a row with room to spare leans on the side of the case
    rows.forEach((R, i) => {
      const s = st[i];
      if (R.mode !== 'upright' || !R.lean || !s.last || s.n < 2) return;
      const p = pos.get(s.last), gap = R.x + R.w - (p.x + p.w);
      if (gap < p.w * 0.7) return;
      p.lean = Math.min(Math.asin(clamp(gap / p.h, 0, 1)) / DEG, R.lean);
    });
    return pos;
  }

  static transform(p, extra = 0) {
    let tx = p.x, ty = p.y, rot = p.rot + extra;
    if (p.lean) {                                   // pivot on the bottom-right corner
      const a = p.lean * DEG, c = Math.cos(a), s = Math.sin(a);
      tx = p.x + p.w - (p.w * c - p.h * s); ty = p.y + p.h - (p.w * s + p.h * c); rot = p.lean + extra;
    }
    // whole pixels and a 2D transform: at rest a spine is drawn straight onto the screen, never resampled
    return `translate(${Math.round(tx)}px, ${Math.round(ty)}px) rotate(${+rot.toFixed(2)}deg)`;
  }

  apply(pos, skip = null) {
    for (const [id, p] of pos) {
      if (id === skip) continue;
      const li = this.nodes.get(id); if (!li) continue;
      const tr = Shelf.transform(p);
      if (li._tr !== tr) { li._tr = tr; li.style.transform = tr; }
      li.classList.toggle('is-flat', p.rot === -90);
      li.classList.toggle('is-lean', !!p.lean);
      li.dataset.row = p.row;
    }
    this.pos = pos;
  }

  /** the book's centre in the scene's coordinates (for anchoring popovers and the tome flight) */
  rectOf(id) {
    const li = this.nodes.get(id); return li ? li.querySelector('.book__spine, .book__lift').getBoundingClientRect() : null;
  }

  /* ---------------------------------------------------------------- state */
  select(id) {
    const prev = this.sel; this.sel = id;
    for (const [k, li] of this.nodes) {
      li.classList.toggle('is-selected', k === id);
      const b = li.firstChild; if (!(this.o.trailing && k === this.o.trailing.id)) { b.setAttribute('aria-expanded', String(k === id)); if (k === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
    }
    this.setTabStop(this.focusId && this.nodes.has(this.focusId) ? this.focusId : id);
    return prev;
  }

  setFilter(set) {
    this.filter = set;
    for (const [id, li] of this.nodes) {
      if (this.o.trailing && id === this.o.trailing.id) { li.classList.toggle('is-dim', !!set); continue; }
      li.classList.toggle('is-dim', !!set && !set.has(id));
      li.classList.toggle('is-match', !!set && set.has(id));
    }
  }

  setTabStop(id) {
    const ids = this.all; if (!ids.length) return;
    if (!id || !this.nodes.has(id)) id = this.sel && this.nodes.has(this.sel) ? this.sel : ids[0];
    this.focusId = id;
    for (const [k, li] of this.nodes) li.firstChild.tabIndex = k === id ? 0 : -1;
  }

  focus(id) { this.setTabStop(id); this.nodes.get(id)?.firstChild.focus({ preventScroll: this.mode === 'desk' }); this.reveal(id); }

  /** keep a focused book visible in the scrolling strip / rail */
  reveal(id) {
    const p = this.pos.get(id); if (!p || this.mode === 'desk') return;
    const sc = this.scene;
    if (this.mode === 'strip') { const x0 = p.x, x1 = p.x + p.w; if (x0 < sc.scrollLeft + 8) sc.scrollTo({ left: x0 - 16, behavior: reducedMotion() ? 'auto' : 'smooth' }); else if (x1 > sc.scrollLeft + sc.clientWidth - 8) sc.scrollTo({ left: x1 - sc.clientWidth + 16, behavior: reducedMotion() ? 'auto' : 'smooth' }); }
    if (this.mode === 'rail') { const y0 = p.y - p.w, y1 = p.y; if (y0 < sc.scrollTop + 8 || y1 > sc.scrollTop + sc.clientHeight - 8) sc.scrollTo({ top: y0 - sc.clientHeight / 2, behavior: reducedMotion() ? 'auto' : 'smooth' }); }
  }

  /** move a book by delta places (keyboard / move buttons) */
  move(id, delta) {
    const i = this.order.indexOf(id); if (i < 0) return false;
    const j = clamp(i + delta, 0, this.order.length - 1); if (j === i) return false;
    this.order.splice(i, 1); this.order.splice(j, 0, id);
    this.layout(true); this.syncDom(); this.o.onReorder?.(this.order, id);
    return true;
  }

  /** the DOM order follows the shelf order once the books have stopped moving (moving a node mid-transition would cut its glide) */
  syncDom() {
    clearTimeout(this._sync);
    this._sync = setTimeout(() => {
      if (this.drag) return this.syncDom();
      const act = document.activeElement;
      // as few moves as possible: a moved node is re-attached and restyled, the rest are left alone
      let cur = this.ul.firstElementChild;
      for (const id of this.all) {
        const n = this.nodes.get(id); if (!n) continue;
        if (n === cur) { cur = cur.nextElementSibling; continue; }
        this.ul.insertBefore(n, cur);
      }
      if (act && this.ul.contains(act) && document.activeElement !== act) act.focus({ preventScroll: true });
    }, 760);
  }

  /** a new book slides in from `from` ('right' | 'top') */
  add(item, from = 'right') {
    this.o.items.set(item.id, item); this.order.push(item.id);
    const li = this.make(item.id);
    if (this.o.trailing) this.ul.append(this.nodes.get(this.o.trailing.id));
    this.measure(this.cfg || this.o.configs(this.mode, ...Object.values(this.size()), this.all.length)[0]);
    const d = this.dim.get(item.id); li.style.width = d.w + 'px'; li.style.height = d.h + 'px'; li._w = d.w; li._h = d.h;
    const { W, H } = this.size();
    li.classList.add('is-entering');
    li.style.transition = 'none';
    li.style.transform = from === 'top' ? `translate(${Math.round(W * 0.6)}px, ${Math.round(-d.h - 40)}px) rotate(-14deg)` : `translate(${Math.round(W + 40 + this.scene.scrollLeft)}px, ${Math.round(H * 0.5)}px) rotate(8deg)`;
    li._tr = li.style.transform;
    void li.offsetWidth; li.style.transition = '';
    requestAnimationFrame(() => { this.layout(true); setTimeout(() => li.classList.remove('is-entering'), 900); });
    if (this.filter) this.setFilter(this.filter);
    return li;
  }

  remove(id) {
    const li = this.nodes.get(id); if (!li) return;
    this.order = this.order.filter((k) => k !== id); this.nodes.delete(id); this.o.items.delete(id);
    li.classList.add('is-leaving');
    const p = this.pos.get(id);
    if (p && !reducedMotion()) { li.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y + 60)}px) rotate(${p.rot + 10}deg)`; li.style.opacity = '0'; setTimeout(() => li.remove(), 450); }
    else li.remove();
    this.layout(true);
    if (this.focusId === id) this.setTabStop(null);
  }

  /* ---------------------------------------------------------------- input */
  bind() {
    const ul = this.ul;
    ul.addEventListener('click', (e) => {
      if (this.suppressClick) { e.preventDefault(); e.stopPropagation(); this.suppressClick = false; return; }
      const b = e.target.closest('.book'); if (!b) return;
      const id = b.dataset.id; this.setTabStop(id);
      if (this.o.trailing && id === this.o.trailing.id) this.o.onTrailing?.();
      else this.o.onSelect?.(id);
    }, true);

    ul.addEventListener('keydown', (e) => {
      const b = e.target.closest('.book'); if (!b) return;
      const ids = this.all, id = b.dataset.id, i = ids.indexOf(id);
      const isAdd = this.o.trailing && id === this.o.trailing.id;
      const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown', back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      if ((e.altKey || (e.ctrlKey && e.shiftKey)) && (fwd || back) && !isAdd) {
        e.preventDefault();
        if (this.move(id, fwd ? 1 : -1)) this.o.announce?.(`${this.o.items.get(id).title} moved to position ${this.order.indexOf(id) + 1} of ${this.order.length}`);
        else this.o.announce?.(`${this.o.items.get(id).title} is already ${fwd ? 'last' : 'first'}`);
        return;
      }
      let j = null;
      if (fwd) j = Math.min(ids.length - 1, i + 1); else if (back) j = Math.max(0, i - 1);
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = ids.length - 1;
      if (j !== null) { e.preventDefault(); this.focus(ids[j]); }
      if (e.key === 'Escape' && this.drag) { e.preventDefault(); this.endDrag(true); }
    });
    ul.addEventListener('focusin', (e) => { const b = e.target.closest('.book'); if (b) { this.setTabStop(b.dataset.id); this.reveal(b.dataset.id); } });

    ul.addEventListener('pointerdown', (e) => this.down(e));
    ul.addEventListener('contextmenu', (e) => { if (this.drag || this.press) e.preventDefault(); });
    // while dragging with a finger the strip must not scroll
    ul.addEventListener('touchmove', (e) => { if (this.drag) e.preventDefault(); }, { passive: false });
    ul.addEventListener('dragstart', (e) => e.preventDefault());
  }

  down(e) {
    if (e.button !== 0 || this.drag) return;
    const b = e.target.closest('.book'); if (!b) return;
    const id = b.dataset.id; if (this.o.trailing && id === this.o.trailing.id) return;
    if (this.o.canDrag && !this.o.canDrag(id)) return;
    const touch = e.pointerType !== 'mouse';
    const press = this.press = { id, x: e.clientX, y: e.clientY, pid: e.pointerId, touch, t: 0 };
    const move = (ev) => {
      if (ev.pointerId !== press.pid) return;
      if (this.drag) return this.dragMove(ev);
      const dx = ev.clientX - press.x, dy = ev.clientY - press.y, d = Math.hypot(dx, dy);
      if (!press.touch && d > 6) this.startDrag(press, ev);
      else if (press.touch && d > 10) cleanup();      // a finger that moves before the long press is scrolling
    };
    const up = (ev) => {
      if (ev.pointerId !== press.pid) return;
      if (this.drag) { this.endDrag(ev.type === 'pointercancel'); this.suppressClick = true; setTimeout(() => (this.suppressClick = false), 400); }
      cleanup();
    };
    const cleanup = () => { clearTimeout(press.t); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (this.press === press) this.press = null; };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    if (touch) press.t = setTimeout(() => { if (this.press === press) this.startDrag(press, { clientX: press.x, clientY: press.y }); }, 320);
  }

  startDrag(press, ev) {
    const id = press.id, li = this.nodes.get(id), p = this.pos.get(id); if (!li || !p) return;
    const r = this.ul.getBoundingClientRect();
    const start = Shelf.center(p);
    this.drag = { id, li, ox: r.left, oy: r.top, gx: press.x - r.left - start.x, gy: press.y - r.top - start.y, idx: this.order.indexOf(id), lastX: press.x, vx: 0, tilt: 0, from: this.order.indexOf(id), base: p };
    li.classList.add('is-dragging');
    try { li.firstChild.setPointerCapture?.(press.pid); } catch (err) {}
    this.o.onDragStart?.(id);
    this.dragMove(ev);
  }

  static center(p) { return p.rot === -90 ? { x: p.x + p.h / 2, y: p.y - p.w / 2 } : { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }

  dragMove(ev) {
    const D = this.drag; if (!D) return;
    if (this.mode !== 'desk') { const r = this.ul.getBoundingClientRect(); D.ox = r.left; D.oy = r.top; }   // the strip may have scrolled
    const cx = ev.clientX - D.ox - D.gx, cy = ev.clientY - D.oy - D.gy;
    // the book follows the pointer and tips with its speed, like something held at the top
    D.vx = D.vx * 0.7 + (ev.clientX - D.lastX) * 0.3; D.lastX = ev.clientX;
    D.tilt = clamp(D.vx * 1.4, -14, 14);
    const base = { ...this.pos.get(D.id) || D.base };
    const c0 = Shelf.center(base);
    const q = { ...base, x: base.x + (cx - c0.x), y: base.y + (cy - c0.y), lean: 0 };
    D.li.style.transform = Shelf.transform(q, D.tilt);
    // nearest slot: try every insertion point, keep the closest
    const rest = this.order.filter((k) => k !== D.id);
    let best = D.idx, bd = Infinity, bestPos = null;
    for (let i = 0; i <= rest.length; i++) {
      const ord = [...rest.slice(0, i), D.id, ...rest.slice(i)];
      const pos = this.compute(this.o.trailing ? [...ord, this.o.trailing.id] : ord, this.cfg, true); if (!pos) continue;
      const c = Shelf.center(pos.get(D.id)), dd = Math.hypot(c.x - cx, (c.y - cy) * 1.3);
      if (dd < bd) { bd = dd; best = i; bestPos = pos; }
    }
    if (best !== D.idx && bestPos) {
      D.idx = best; this.order = [...rest.slice(0, best), D.id, ...rest.slice(best)];
      this.apply(bestPos, D.id); this.o.afterLayout?.(bestPos, this.cfg, this.mode, false);
    }
    // edge auto-scroll in the strip / rail
    const sc = this.scene, sr = sc.getBoundingClientRect();
    if (this.mode === 'strip') { if (ev.clientX < sr.left + 36) sc.scrollLeft -= 10; else if (ev.clientX > sr.right - 36) sc.scrollLeft += 10; }
    if (this.mode === 'rail') { if (ev.clientY < sr.top + 36) sc.scrollTop -= 10; else if (ev.clientY > sr.bottom - 36) sc.scrollTop += 10; }
  }

  endDrag(cancel = false) {
    const D = this.drag; if (!D) return;
    if (cancel) { this.order.splice(this.order.indexOf(D.id), 1); this.order.splice(D.from, 0, D.id); }
    this.drag = null;
    D.li.classList.remove('is-dragging');
    D.li._tr = '';
    this.layout(true); this.syncDom();
    const moved = this.order.indexOf(D.id) !== D.from;
    this.o.onDragEnd?.(D.id, moved);
    if (moved && !cancel) {
      this.o.onReorder?.(this.order, D.id);
      this.o.announce?.(`${this.o.items.get(D.id).title} moved to position ${this.order.indexOf(D.id) + 1} of ${this.order.length}`);
    }
  }
}
