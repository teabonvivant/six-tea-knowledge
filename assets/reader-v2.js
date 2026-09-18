/* Progressive enhancement: reading and directory navigation work without JS; keyword search requires JS. */
(() => {
  const menu = document.querySelector('.mobile-nav');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });
  const toc = document.querySelector('.chapter-toc');
  const desktop = matchMedia('(min-width: 980px)');
  if (toc) {
    toc.open = desktop.matches;
    desktop.addEventListener('change', event => { toc.open = event.matches; });
    toc.addEventListener('click', event => {
      if (!desktop.matches && event.target.closest('a[href^="#"]')) {
        toc.open = false;
      }
    });
  }
  function revealAnchor() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let parent = target.parentElement;
    let revealed = false;
    if (target instanceof HTMLDetailsElement && !target.open) { target.open = true; revealed = true; }
    while (parent) {
      if (parent instanceof HTMLDetailsElement && !parent.open) { parent.open = true; revealed = true; }
      parent = parent.parentElement;
    }
    if (revealed) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange', revealAnchor);
  revealAnchor();
  document.querySelectorAll('.table-wrap,.matrix-wrap').forEach((table, index) => {
    table.tabIndex = 0;
    table.setAttribute('role','region');
    table.setAttribute('aria-label', `可橫向捲動的資料表 ${index + 1}`);
  });
  const article = document.querySelector('.chapter-copy');
  const progress = document.querySelector('.reading-progress');
  if (article && progress) {
    const sectionLinks = [...document.querySelectorAll('.chapter-toc a[href^="#"]')];
    let scheduled = false;
    const update = () => {
      const box = article.getBoundingClientRect();
      const distance = Math.max(1, box.height - innerHeight + 100);
      const value = Math.max(0, Math.min(1, (100 - box.top) / distance));
      progress.style.transform = `scaleX(${value})`;
      let current = sectionLinks[0];
      for (const link of sectionLinks) {
        const section = document.getElementById(link.hash.slice(1));
        if (section && section.getBoundingClientRect().top <= 160) current = link;
      }
      for (const link of sectionLinks) {
        if (link === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    }, {passive:true});
    window.addEventListener('resize', update);
    update();
  }
})();
