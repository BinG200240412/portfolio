/* Catalog titles remain the source of both language versions. */
(() => {
  const copy = {'档案库':'Archive','档案库 — Cai Zhengyang':'Archive — Cai Zhengyang','项目文档':'Project documents','翻阅':'Read'};
  try {
    const catalog=JSON.parse(document.getElementById('archive-catalog').textContent);
    for(const document of catalog.documents){
      const zh=document.title.zh,en=document.title.en,count=document.pages.length;
      copy[zh]=en;copy[`翻阅：${zh}`]=`Read: ${en}`;copy[`下载 PDF：${zh}`]=`Download PDF: ${en}`;
      copy[`${count} 页`]=`${count} ${count===1?'page':'pages'}`;
    }
  } catch (_) {}
  window.PORTFOLIO_TRANSLATIONS=Object.assign({},window.PORTFOLIO_TRANSLATIONS,copy);
})();
