/* Tea Atlas editorial tools. All core reading/navigation remains static HTML. */
(() => {
  'use strict';
  function init() {
    const base = '/six-tea-knowledge/';
    const storageKey = 'tea-atlas.saved.v4';
    const $ = (selector) => document.querySelector(selector);
    const message = text => { const el = $('[data-reader-message]'); if (el) el.textContent = text; };
    const safeRoute = route => typeof route === 'string' && /^\/six-tea-knowledge\/tea\/(green|white|yellow|oolong|black|dark)-tea\/[a-z-]+\/$/.test(route);
    const saved = () => {
      const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(data) ? data.filter(x => x && safeRoute(x.route) && typeof x.title === 'string').slice(0,100) : [];
    };
    const toolbar = $('[data-reading-tools]');
    if (toolbar) {
      toolbar.hidden = false;
      const route = document.body.dataset.route;
      const save = $('[data-save-chapter]');
      const refresh = () => { try { const found = saved().some(x => x.route === route); save.setAttribute('aria-pressed',String(found)); save.textContent = found ? '已收藏本章' : '收藏本章'; } catch { save.setAttribute('aria-pressed','false'); } };
      refresh();
      save?.addEventListener('click',() => {
        try {
          if (!safeRoute(route)) throw new Error('Invalid route');
          const list = saved(), exists = list.some(x => x.route === route);
          const next = exists ? list.filter(x => x.route !== route) : [{route,title:document.querySelector('h1').textContent.trim()},...list].slice(0,100);
          localStorage.setItem(storageKey,JSON.stringify(next)); refresh();
          message(exists ? '已取消收藏。' : '已收藏。資料只存於此瀏覽器，不會同步到其他裝置。');
        } catch { message('此瀏覽器未能保存收藏；仍可使用瀏覽器本身的書籤功能。'); }
      });
      const size = $('[data-reading-size]');
      try { document.body.classList.toggle('v4-large-type',localStorage.getItem('tea-atlas.type.v4') === 'large'); } catch { /* Storage is optional. */ }
      const updateSize = () => { const large = document.body.classList.contains('v4-large-type'); size?.setAttribute('aria-pressed',String(large)); if (size) size.textContent = large ? '還原字級' : '放大字級'; };
      updateSize();
      size?.addEventListener('click',() => { const large = document.body.classList.toggle('v4-large-type'); updateSize(); try { localStorage.setItem('tea-atlas.type.v4',large?'large':'normal'); } catch { /* Current page still works. */ } });
      const toggle = $('[data-toggle-sources]');
      toggle?.addEventListener('click',() => {
        const details = [...document.querySelectorAll('main > details.source-disclosure')];
        const expand = details.some(x => !x.open); details.forEach(x => { x.open = expand; });
        toggle.setAttribute('aria-expanded',String(expand)); toggle.textContent = expand ? '收起本章來源' : '展開本章來源';
        message(expand ? '已展開正文下方的來源；可由目錄跳至原始引文。' : '已收起本章來源。');
      });
    }
    const savedRoot = $('[data-saved-list]');
    if (savedRoot) {
      const renderSaved = () => {
        savedRoot.replaceChildren();
        try {
          const rows = saved();
          if (!rows.length) { const p = document.createElement('p'); p.className = 'v4-empty'; p.textContent = '尚未收藏章節。打開任何六大茶專章，按「收藏本章」即可加入。'; savedRoot.append(p); return; }
          const ul = document.createElement('ul'); ul.className = 'v4-saved';
          for (const row of rows) {
            const li = document.createElement('li'), a = document.createElement('a'), button = document.createElement('button');
            a.href = row.route; a.textContent = row.title;
            button.type = 'button'; button.textContent = '移除'; button.setAttribute('aria-label','移除收藏：'+row.title);
            button.addEventListener('click',() => { try { localStorage.setItem(storageKey,JSON.stringify(saved().filter(x => x.route !== row.route))); renderSaved(); } catch { $('#saved-status').textContent = '未能更新收藏，請檢查瀏覽器儲存設定。'; } });
            li.append(a,button); ul.append(li);
          }
          savedRoot.append(ul);
        } catch { savedRoot.textContent = '未能讀取此瀏覽器的收藏；網站文章仍可正常閱讀。'; }
      };
      renderSaved(); window.addEventListener('storage',renderSaved);
    }
    const comparison = $('[data-compare-widget]');
    if (comparison) {
      const data = JSON.parse($('#v4-compare-data').textContent);
      const left = $('#compare-left'), right = $('#compare-right'), result = $('#compare-results');
      const render = () => {
        result.replaceChildren();
        for (const select of [left,right]) {
          const record = data[select.value]; if (!record) continue;
          const card = document.createElement('article'); card.className = 'v4-compare-card'; card.dataset.tea = record.tea;
          const h = document.createElement('h3'); h.textContent = record.name;
          const p = document.createElement('p'); p.textContent = record.description;
          const ol = document.createElement('ol');
          for (const step of record.steps) { const li = document.createElement('li'); li.textContent = step; ol.append(li); }
          const a = document.createElement('a'); a.href = base+'tea/'+select.value+'/manufacturing/'; a.className = 'text-link'; a.textContent = '細讀'+record.name+'製法 →';
          card.append(h,p,ol,a); result.append(card);
        }
        $('#compare-status').textContent = left.value === right.value ? '目前選了相同茶類；選另一類即可並讀。' : '正在比較：'+data[left.value].name+'與'+data[right.value].name+'。圖示是常見路徑，不代表所有產品。';
      };
      comparison.hidden = false; left.addEventListener('change',render); right.addEventListener('change',render); render();
    }
    const filters = $('[data-study-filter]');
    if (filters) {
      filters.hidden = false;
      const searchForm = $('form.filter'), kindField = searchForm?.querySelector('[name="kind"]');
      const sync = kind => filters.querySelectorAll('button[data-kind]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.kind === (kind || 'all'))));
      document.addEventListener('tea-search-state', event => sync(event.detail.kind));
      sync(kindField?.value);
      filters.addEventListener('click',event => {
        const button = event.target.closest('button[data-kind]'); if (!button || !kindField) return;
        kindField.value = button.dataset.kind === 'all' ? '' : button.dataset.kind;
        sync(kindField.value); searchForm.requestSubmit();
        $('#study-filter-status').textContent = '篩選已套用；上方搜尋結果同時考慮研究類型、關鍵詞及茶類。分類是閱讀輔助，並非臨床證據評級。';
      });
    }
    const form = $('#brewing-notes');
    if (form) {
      const controls = $('[data-notes-controls]'); controls.hidden = false;
      const status = $('#notes-status'), output = $('#notes-output');
      const fields = [...form.querySelectorAll('[name]')];
      const read = () => Object.fromEntries(fields.map(el => [el.name,el.value.slice(0,3000)]));
      const summary = data => {
        const lines = ['我的沖泡比較記錄','茶樣：'+(data.tea||'未填'),'本次只改：'+(data.variable||'未填')];
        for (const suffix of ['a','b']) {
          const gram=Number(data['grams_'+suffix]), water=Number(data['water_'+suffix]);
          lines.push('',suffix.toUpperCase()+' 泡',`茶量：${data['grams_'+suffix]||'未填'} g；水量：${data['water_'+suffix]||'未填'} mL`, `水溫：${data['temp_'+suffix]||'未填'} °C；時間：${data['seconds_'+suffix]||'未填'} 秒`);
          if (gram>0 && water>0) lines.push(`茶水比例：1 g 茶葉配 ${(water/gram).toFixed(1)} mL 水（按輸入值計算）`);
          lines.push('器具／用水／第幾泡：'+(data['conditions_'+suffix]||'未填'),'觀察：'+(data['notes_'+suffix]||'未填'));
        }
        lines.push('','這是個人品飲記錄，不是審評標準、研究數據或健康劑量建議。'); return lines.join('\n');
      };
      const show = () => { output.textContent = summary(read()); output.hidden = false; };
      try { const old=JSON.parse(localStorage.getItem('tea-atlas.notes.v4')||'null'); if(old && typeof old==='object') for(const el of fields) if(typeof old[el.name]==='string') el.value=old[el.name].slice(0,3000); } catch { /* Private mode should not prevent note-taking. */ }
      form.addEventListener('submit',event => { event.preventDefault(); if(form.reportValidity()) { show(); status.textContent = '已根據你輸入的內容整理，沒有補填任何數值。'; } });
      $('[data-notes-save]').addEventListener('click',() => { try { localStorage.setItem('tea-atlas.notes.v4',JSON.stringify(read())); show(); status.textContent='已儲存在此瀏覽器；沒有上傳或跨裝置同步。'; } catch { show(); status.textContent='此瀏覽器無法儲存；下方已顯示內容，可手動複製。'; } });
      $('[data-notes-copy]').addEventListener('click',async () => { show(); try { await navigator.clipboard.writeText(output.textContent); status.textContent='已複製比較記錄。'; } catch { status.textContent='未能自動複製；請選取下方記錄手動複製。'; } });
    }
    // A 404 has no client-side redirect. It offers explicit, ordinary navigation.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
