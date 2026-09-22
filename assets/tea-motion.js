/* Progressive enhancement: the original links and articles never wait for motion. */
(() => {
  'use strict';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'tea-atlas.reduced-motion.v1';
  const active = new Set();
  let userReduced = false;
  try { userReduced = localStorage.getItem(key) === 'true'; } catch { /* Optional preference. */ }
  const reduced = () => media.matches || userReduced;
  const preference = document.createElement('div');
  preference.className = 'motion-preference';
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'motion-toggle';
  preference.append(toggle);
  document.querySelector('.footer')?.append(preference);
  function syncMotion() {
    document.body.dataset.teaMotion = reduced() ? 'reduced' : 'full';
    toggle.setAttribute('aria-pressed', String(reduced()));
    toggle.textContent = media.matches ? '已跟隨系統減少動態' : userReduced ? '減少動態：已開啟' : '減少動態效果';
    toggle.disabled = media.matches;
    if (reduced()) for (const item of active) item.animation.finish();
  }
  toggle.addEventListener('click', () => {
    userReduced = !userReduced;
    try { localStorage.setItem(key, String(userReduced)); } catch { /* Works on this page. */ }
    syncMotion();
  });
  media.addEventListener('change', syncMotion);
  window.addEventListener('storage', event => {
    if (event.key === key) { userReduced = event.newValue === 'true'; syncMotion(); }
  });
  syncMotion();
  function motion(element, frames, duration, owner) {
    if (reduced() || !element.animate) return Promise.resolve();
    const animation = element.animate(frames, {duration, easing:'cubic-bezier(.16,1,.3,1)'});
    const item = {animation, owner}; active.add(item);
    return animation.finished.catch(() => {}).finally(() => active.delete(item));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) for (const item of active) item.animation.finish();
  });
  document.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      for (const item of active) if (item.owner === details) item.animation.cancel();
      [...details.children].filter(el => el.tagName !== 'SUMMARY').forEach(el => {
        motion(el, [{opacity:.3, transform:'translateY(-5px)'},{opacity:1, transform:'translateY(0)'}], 220, details);
      });
    });
  });
  const feature = document.querySelector('[data-tea-journal]');
  if (!feature) return;
  let entries;
  try { entries = JSON.parse(document.getElementById('tea-journal-data').textContent); } catch { return; }
  if (!Array.isArray(entries) || !entries.length) return;
  const book = feature.querySelector('.journal-book');
  const spread = feature.querySelector('.book-spread');
  const cover = feature.querySelector('.book-cover');
  const reading = feature.querySelector('.book-reading');
  const art = feature.querySelector('.book-art');
  const controls = feature.querySelector('.book-controls');
  const status = feature.querySelector('[data-book-status]');
  let index = 0, version = 0;
  function stopBook() {
    version += 1;
    for (const item of active) if (item.owner === book) item.animation.cancel();
    book.querySelectorAll('.book-turn-leaf').forEach(el => el.remove());
    return version;
  }
  function render() {
    const entry = entries[index];
    reading.querySelector('h3').textContent = entry.title;
    reading.querySelector('.book-topic').textContent = entry.category;
    reading.querySelector('.book-excerpt').textContent = entry.excerpt;
    const link = reading.querySelector('a'); link.href = entry.url;
    link.setAttribute('aria-label', '閱讀全文：' + entry.title);
    art.querySelector('img').src = entry.image;
    art.querySelector('img').alt = entry.alt;
    art.querySelector('figcaption').textContent = entry.alt;
    status.textContent = `第 ${index + 1} / ${entries.length} 篇`;
    const preload = new Image(); preload.src = entries[(index + 1) % entries.length].image;
  }
  function wordsArrive() {
    motion(reading.querySelector('h3'), [{opacity:.2, transform:'translateY(9px)'},{opacity:1, transform:'translateY(0)'}], 360, book);
    motion(reading.querySelector('.book-excerpt'), [{opacity:.3,clipPath:'inset(0 0 20% 0)'},{opacity:1,clipPath:'inset(0 0 0 0)'}], 430, book);
  }
  async function openBook() {
    if (book.dataset.state === 'open') return;
    const token = stopBook();
    book.dataset.state = 'open'; spread.inert = false; spread.removeAttribute('aria-hidden');
    cover.setAttribute('aria-expanded','true'); controls.hidden = false;
    render(); reading.focus({preventScroll:true}); wordsArrive();
    await motion(cover, [{transform:'rotateY(0deg)',opacity:1},{transform:'rotateY(-65deg)',opacity:1,offset:.55},{transform:'rotateY(-155deg)',opacity:0}], 760, book);
    if (token === version && book.dataset.state === 'open') cover.hidden = true;
  }
  function closeBook() {
    stopBook(); book.dataset.state = 'closed'; spread.inert = true; spread.setAttribute('aria-hidden','true');
    cover.hidden = false; cover.setAttribute('aria-expanded','false'); controls.hidden = true;
    cover.focus({preventScroll:true});
    motion(cover, [{transform:'rotateY(-90deg)',opacity:0},{transform:'rotateY(0deg)',opacity:1}], 420, book);
  }
  async function turn(delta) {
    if (book.dataset.state !== 'open') return;
    const token = stopBook(); cover.hidden = true;
    const single = matchMedia('(max-width: 760px)').matches;
    const leaf = (delta < 0 && !single ? art : reading).cloneNode(true);
    leaf.classList.add('book-turn-leaf'); leaf.removeAttribute('id'); leaf.removeAttribute('tabindex');
    leaf.setAttribute('aria-hidden','true'); leaf.inert = true;
    if (single) {
      leaf.style.top = reading.offsetTop + 'px'; leaf.style.height = reading.offsetHeight + 'px'; leaf.style.bottom = 'auto';
      leaf.style.transformOrigin = delta < 0 ? 'right center' : 'left center';
    }
    index = (index + delta + entries.length) % entries.length;
    if (!reduced()) book.append(leaf);
    render();
    await motion(leaf, [{transform:'rotateY(0deg)',opacity:1},{transform:`rotateY(${delta < 0 ? 155 : -155}deg)`,opacity:0}], 520, book);
    leaf.remove();
    if (token === version) wordsArrive();
  }
  cover.addEventListener('click', openBook);
  feature.querySelector('[data-book-close]').addEventListener('click', closeBook);
  feature.querySelector('[data-book-prev]').addEventListener('click', () => turn(-1));
  feature.querySelector('[data-book-next]').addEventListener('click', () => turn(1));
  feature.addEventListener('keydown', event => {
    if (book.dataset.state !== 'open' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); turn(event.key === 'ArrowRight' ? 1 : -1); }
    if (event.key === 'Escape') { event.preventDefault(); closeBook(); }
  });
  let start;
  book.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && !event.target.closest('a,button')) start = {x:event.clientX,y:event.clientY};
  });
  book.addEventListener('pointercancel', () => { start = null; });
  book.addEventListener('pointerup', event => {
    if (!start) return;
    const x = event.clientX - start.x, y = event.clientY - start.y; start = null;
    if (Math.abs(x) > 65 && Math.abs(x) > Math.abs(y) * 1.5) turn(x < 0 ? 1 : -1);
  });
  feature.hidden = false;
  window.addEventListener('hashchange', () => {
    if (location.hash === '#tea-journal') openBook();
  });
  if (location.hash === '#tea-journal') openBook();
})();
