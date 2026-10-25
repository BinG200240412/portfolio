Object.assign(window.PORTFOLIO_CASE_TRANSLATIONS ||= {}, {
  'PLIX 字重对比 — Who am I':'PLIX weight comparison — Who am I',
  'PLIX 字重对比':'PLIX weight comparison',
  '相同字号与内容，比较两档粗细。':'The same text and sizes, in two weights.',
  '正文字号':'Body text size',
  '当前网站使用的字重。':'The weight currently used on the site.',
  '更厚一档，字库覆盖相同。':'One step heavier, with the same character coverage.',
  '字体来源':'Font sources',
  '页面颜色与语言':'Appearance and language'
});
document.addEventListener('DOMContentLoaded', () => {
  // The interface may be English; the CJK trial itself must still show Chinese.
  function keepPreviewsChinese() {
    const english = window.PortfolioI18n?.language === 'en';
    document.querySelectorAll('.type-font-name a').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('lang', 'zh');
      link.setAttribute('href', url.pathname + url.search + url.hash);
      link.querySelector('[data-try-label]').textContent = english ? 'Try' : '试用';
      link.setAttribute('aria-label', (english ? 'Preview in About Me: ' : '在关于我中试用 ') + link.dataset.fontLabel);
    });
  }
  addEventListener('portfolio:language', keepPreviewsChinese);
  keepPreviewsChinese();
  const input = document.getElementById('sample-size');
  const output = document.getElementById('sample-size-value');
  const update = () => {
    const size = Math.max(14, Math.min(22, Number(input.value) || 17));
    document.documentElement.style.setProperty('--sample-size', size + 'px');
    output.textContent = size + 'px';
  };
  input.addEventListener('input', update);
  update();
});
