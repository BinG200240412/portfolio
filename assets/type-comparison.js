Object.assign(window.PORTFOLIO_CASE_TRANSLATIONS ||= {}, {
  '中文字体对比 — Who am I':'Chinese type comparison — Who am I',
  '中文字体对比':'Chinese type comparison',
  '相同字号与内容，比较两种中文字形。':'The same text and sizes, in two Chinese typefaces.',
  '正文字号':'Body text size',
  '普利世 · Light':'Plix · Light',
  '完整覆盖当前网站的中文内容。':'Covers all Chinese text currently used on the site.',
  '部分简体缺字，预览中用 PLIX 补齐。':'Some simplified Chinese characters use PLIX as a fallback.',
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
