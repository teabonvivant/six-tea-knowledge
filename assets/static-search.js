/* Accessible browser-side search for the static export. No server-side search is implied. */
(() => {
  'use strict';
  const base = '/six-tea-knowledge/';
  const form = document.querySelector('form.filter');
  const input = form?.querySelector('[name="q"]');
  if (!form || !input) return;
  const scopes = {research:'/work/',experts:'/expert/',institutions:'/institution/',products:'/product/',protocols:'/protocol/','process-profiles':'/process-profile/','sensory-records':'/sensory-record/',compounds:'/compound/',studies:'/study/','therapy-records':'/therapy-record/',timeline:'/event/','story-archive':'/story/'};
  const action = new URL(form.getAttribute('action'), document.baseURI).pathname;
  const section = Object.keys(scopes).find(key => action === base + key + '/');
  const globalSearch = action === base + 'search/';
  if (!globalSearch && !section) return;
  const select = form.querySelector('[name="tea"]');
  const kindField = form.querySelector('[name="kind"]');
  const validKinds = new Set(['human','observational','animal','cell','review']);
  const teaAliases = {green_tea:['綠茶','绿茶'],white_tea:['白茶'],yellow_tea:['黃茶','黄茶'],oolong_tea:['烏龍茶','乌龙茶','青茶'],black_tea:['紅茶','红茶'],dark_tea:['黑茶']};
  const norm = value => String(value || '').normalize('NFKC').toLocaleLowerCase();
  let root = document.querySelector('[data-static-results]');
  if (!root) { root = document.createElement('section'); root.setAttribute('data-static-results',''); }
  root.className = 'section search-results'; root.setAttribute('aria-label','搜尋結果'); root.replaceChildren();
  const heading = document.createElement('h2'); heading.textContent = '搜尋結果';
  const status = document.createElement('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); status.setAttribute('aria-atomic','true');
  const list = document.createElement('div'); list.className = 'list';
  const more = document.createElement('button'); more.type = 'button'; more.className = 'button search-more'; more.textContent = '顯示更多結果'; more.hidden = true;
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'search-clear'; clear.textContent = '清除搜尋';
  root.append(heading,status,list,more);
  const anchor = form.closest('section.hero') || form;
  anchor.after(root); form.append(clear);
  const originals = [...document.querySelectorAll('main > section, main > .empty, main > nav.pagination')].filter(el => el !== root && el !== anchor && !el.contains(form) && (el.matches('.empty,nav.pagination') || (section && el.querySelector(`a[href^="${base}${scopes[section].slice(1)}"]`))));
  let loading, request = 0, matches = [], shown = 0, terms = [];
  const pageSize = 40;
  function idle() {
    root.hidden = true; root.removeAttribute('aria-busy'); list.replaceChildren(); more.hidden = true;
    originals.forEach(el => { el.hidden = false; }); clear.hidden = true;
  }
  async function records() {
    if (!loading) loading = (async () => {
      if (section) {
        const response = await fetch(base + 'assets/search/' + section + '.json?v=20260922-6');
        if (response.ok) return response.json();
      }
      const response = await fetch(base + 'assets/search-index.json?v=20260922-6');
      if (!response.ok) throw new Error('Search index unavailable');
      return response.json();
    })().catch(error => { loading = null; throw error; });
    return loading;
  }
  function snippet(value) {
    const text = String(value || '').replace(/\s+/g,' ').trim();
    const lower = norm(text); let position = -1;
    for (const term of terms) { const found = lower.indexOf(term); if (found >= 0 && (position < 0 || found < position)) position = found; }
    const start = Math.max(0,position - 50); const end = Math.min(start + 160,text.length);
    return (start ? '…' : '') + text.slice(start,end) + (end < text.length ? '…' : '');
  }
  function safePath(value) {
    try {
      const url = new URL(value,document.baseURI);
      return url.origin === new URL(document.baseURI).origin && url.pathname.startsWith(base) ? url.pathname + url.search + url.hash : null;
    } catch { return null; }
  }
  function renderMore() {
    const end = Math.min(shown + pageSize,matches.length);
    const fragment = document.createDocumentFragment();
    for (const r of matches.slice(shown,end)) {
      const path = safePath(r.url); if (!path) continue;
      const article = document.createElement('article'); article.className = 'list-item';
      const box = document.createElement('div'), h = document.createElement('h3'), a = document.createElement('a'), p = document.createElement('p');
      a.href = path; a.textContent = r.title; h.append(a); p.textContent = snippet(r.text); box.append(h,p);
      if (r.studyLabel) { const label = document.createElement('p'); label.className = 'v4-study-kind'; label.textContent = r.studyLabel; box.append(label); }
      if (r.note) { const note = document.createElement('p'); note.className = 'meta search-result-note'; note.textContent = r.note; box.append(note); }
      article.append(box); fragment.append(article);
    }
    list.append(fragment); shown = end; more.hidden = shown >= matches.length;
    status.textContent = matches.length ? `找到 ${matches.length} 項結果，已顯示 ${shown} 項。` : '找不到相符結果。可試試縮短關鍵詞，或改用茶名、產區、工序名稱。';
  }
  async function run() {
    const token = ++request; const q = input.value.trim(), tea = select?.value || '';
    const kind = validKinds.has(kindField?.value) ? kindField.value : '';
    document.dispatchEvent(new CustomEvent('tea-search-state',{detail:{kind}}));
    clear.hidden = !q && !tea && !kind;
    if (!q && !tea && !kind) { idle(); return; }
    root.hidden = false; root.setAttribute('aria-busy','true');
    originals.forEach(el => { el.hidden = true; });
    list.replaceChildren(); more.hidden = true; status.textContent = '正在載入搜尋資料…';
    try {
      const data = await records(); if (token !== request) return;
      terms = norm(q).split(/\s+/).filter(Boolean);
      const wantedTea = Object.hasOwn(teaAliases,tea) ? tea : tea + '_tea';
      const grouped = new Map();
      for (const r of data) {
        if (!safePath(r.url) || (section && !r.route.startsWith(scopes[section]))) continue;
        if (kind && r.studyKind !== kind) continue;
        const title = norm(r.title), text = norm(r.text);
        if (tea && (Array.isArray(r.teas) ? !r.teas.includes(wantedTea) : !(teaAliases[wantedTea] || [tea]).some(v => text.includes(norm(v))))) continue;
        if (!terms.every(t => title.includes(t) || text.includes(t))) continue;
        const score = terms.reduce((sum,t) => sum + (title === t ? 30 : title.includes(t) ? 10 : 1),0);
        const key = r.workIdentity || r.route;
        const previous = grouped.get(key);
        if (!previous || score > previous.score || (score === previous.score && r.text.length > previous.r.text.length)) grouped.set(key,{r,score});
      }
      matches = [...grouped.values()].sort((a,b) => b.score - a.score || a.r.title.localeCompare(b.r.title,'zh-Hant')).map(x => x.r);
      shown = 0; renderMore();
    } catch {
      if (token !== request) return;
      status.textContent = '未能載入搜尋資料。請再按一次搜尋重試；原有目錄已恢復，可繼續瀏覽。';
      originals.forEach(el => { el.hidden = false; });
    } finally { if (token === request) root.removeAttribute('aria-busy'); }
  }
  function updateURL() {
    const url = new URL(location.href); url.search = new URLSearchParams(new FormData(form)).toString();
    try { history.replaceState({},'',url); } catch { /* Standalone previews can prohibit history updates. */ }
  }
  form.addEventListener('submit',event => { event.preventDefault(); updateURL(); run(); });
  select?.addEventListener('change',() => { updateURL(); run(); });
  clear.addEventListener('click',() => { input.value = ''; if (select) select.value = ''; if (kindField) kindField.value = ''; updateURL(); run(); input.focus(); });
  more.addEventListener('click',renderMore);
  function restore() {
    const params = new URLSearchParams(location.search);
    input.value = params.get('q') || '';
    if (select) select.value = params.get('tea') || '';
    if (kindField) kindField.value = validKinds.has(params.get('kind')) ? params.get('kind') : '';
    run();
  }
  window.addEventListener('popstate',restore); restore();
})();
