(() => {
  const base = '/six-tea-knowledge/';
  const form = document.querySelector('form.filter');
  if (!form) return;
  const input = form.querySelector('[name=q]');
  if (!input) return;
  const action = new URL(form.action).pathname;
  const scopes = {research:'/work/',experts:'/expert/',institutions:'/institution/',products:'/product/',protocols:'/protocol/','process-profiles':'/process-profile/','sensory-records':'/sensory-record/',compounds:'/compound/',studies:'/study/','therapy-records':'/therapy-record/',timeline:'/event/','story-archive':'/story/'};
  const section = Object.keys(scopes).find(key => action === base+key+'/');
  const global = action === base+'search/';
  let root = document.querySelector('[data-static-results]');
  if (!root) { root=document.createElement('section'); root.className='section'; root.innerHTML='<p role="status"></p><div class="list"></div>'; form.closest('section')?.after(root); if (!root.isConnected) form.after(root); }
  const status=root.querySelector('[role=status]'), list=root.querySelector('.list');
  const norm=s=>(s||'').normalize('NFKC').toLocaleLowerCase();
  let promise;
  const teaNames={green:'綠茶',white:'白茶',yellow:'黃茶',oolong:'烏龍',black:'紅茶',dark:'黑茶'};
  async function run() {
    const q=input.value.trim(), tea=form.querySelector('[name=tea]');
    const teaText=tea?.value ? (teaNames[tea.value] || tea.selectedOptions[0].textContent) : '';
    if (!q && !teaText) {status.textContent=global?'輸入關鍵詞搜尋公開頁面。':'';list.replaceChildren();return;}
    status.textContent='正在搜尋公開頁面…';
    try {
      promise ||= fetch(base+'assets/search-index.json').then(r=>{if(!r.ok)throw Error();return r.json()});
      const records=await promise, terms=norm(q).split(/\s+/).filter(Boolean);
      const matches=records.filter(r=>!section || r.route.startsWith(scopes[section])).map(r=>{
        const title=norm(r.title),text=norm(r.text);
        if(teaText&&!text.includes(norm(teaText)))return null;
        if(!terms.every(t=>title.includes(t)||text.includes(t)))return null;
        return {r,score:terms.reduce((s,t)=>s+(title.includes(t)?10:1),0)};
      }).filter(Boolean).sort((a,b)=>b.score-a.score);
      status.textContent=`找到 ${matches.length} 項公開頁面${matches.length>80?'，顯示首 80 項':''}`;
      list.replaceChildren();
      for(const {r} of matches.slice(0,80)) {
        const article=document.createElement('article');article.className='list-item';
        const box=document.createElement('div'),h=document.createElement('h3'),a=document.createElement('a'),p=document.createElement('p');
        a.href=r.url;a.textContent=r.title;h.append(a);p.textContent=r.text.slice(0,200);box.append(h,p);article.append(box);list.append(article);
      }
    } catch {status.textContent='未能載入搜尋索引，請重新整理頁面。';promise=null;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();const u=new URL(location.href);u.search=new URLSearchParams(new FormData(form)).toString();history.replaceState({},'',u);run();});
  const params=new URLSearchParams(location.search);if(params.has('q'))input.value=params.get('q');
  const select=form.querySelector('[name=tea]');if(select&&params.has('tea'))select.value=params.get('tea');
  if(input.value || select?.value)run();
})();
