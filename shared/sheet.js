// SHELF: draggable bottom sheet for phones (peek / half / full). Moved by transform only.
import { clamp, reducedMotion } from './util.js';

export class Sheet {
  /**
   * @param {HTMLElement} el      the sheet (position: fixed; bottom: 0)
   * @param {object} o  handle: element you can drag; grip: button that steps through the states;
   *                    snaps(): { peek, half, full } visible heights in px;  onSnap(name); label(name) → grip label
   */
  constructor(el, o) {
    this.el = el; this.o = o; this.state = 'half'; this.off = 0; this.enabled = false;
    o.grip.addEventListener('click', () => { if (this.moved) return; this.set(this.state === 'peek' ? 'half' : this.state === 'half' ? 'full' : 'peek'); });
    o.handle.addEventListener('pointerdown', (e) => this.down(e));
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.enabled && this.state !== 'peek') { e.stopPropagation(); this.set('peek'); o.grip.focus(); } });
  }

  enable(on) {
    this.enabled = on; this.el.classList.toggle('is-on', on);
    if (on) this.set(this.state, false); else { this.el.style.transform = ''; this.el.style.height = ''; this.el.style.removeProperty('--vis'); }
  }

  measure() { this.s = this.o.snaps(); this.el.style.height = this.s.full + 'px'; }

  set(name, animate = true) {
    if (!this.enabled) { this.state = name; return; }
    this.measure();
    this.state = name;
    const vis = this.s[name];
    this.off = this.s.full - vis;
    this.el.classList.toggle('no-anim', !animate || reducedMotion());
    this.el.style.transform = `translate3d(0, ${this.off}px, 0)`;
    this.el.dataset.state = name;
    this.el.style.setProperty('--vis', vis + 'px');
    this.el.style.setProperty('--off', this.off + 'px');
    this.o.grip.setAttribute('aria-expanded', String(name !== 'peek'));
    this.o.grip.setAttribute('aria-label', this.o.label ? this.o.label(name) : name);
    this.o.onSnap?.(name);
  }

  down(e) {
    if (!this.enabled || e.button !== 0) return;
    if (e.target.closest('button:not(.sheet__grip), a, input, textarea, [role=treeitem], [role=option]')) return;
    this.measure();
    const y0 = e.clientY, off0 = this.off, max = this.s.full - this.s.peek;
    let last = [{ y: y0, t: performance.now() }], dragging = false;
    this.moved = false;
    const move = (ev) => {
      const dy = ev.clientY - y0;
      if (!dragging && Math.abs(dy) < 6) return;
      if (!dragging) { dragging = true; this.moved = true; this.el.classList.add('no-anim'); this.el.classList.add('is-dragging'); }
      let o = off0 + dy;
      if (o < 0) o = -Math.sqrt(-o) * 2.5; else if (o > max) o = max + Math.sqrt(o - max) * 2.5;   // rubber band
      this.off = o; this.el.style.transform = `translate3d(0, ${o}px, 0)`;
      last.push({ y: ev.clientY, t: performance.now() }); if (last.length > 6) last.shift();
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      this.el.classList.remove('is-dragging');
      if (!dragging) return;
      const a = last[0], b = last[last.length - 1], v = (b.y - a.y) / Math.max(16, b.t - a.t);   // px per ms
      const proj = clamp(this.off + v * 220, 0, max);
      const vis = this.s.full - proj;
      const pick = Object.entries({ peek: this.s.peek, half: this.s.half, full: this.s.full }).sort((p, q) => Math.abs(p[1] - vis) - Math.abs(q[1] - vis))[0][0];
      requestAnimationFrame(() => this.set(pick, true));
      setTimeout(() => (this.moved = false), 50);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
}
