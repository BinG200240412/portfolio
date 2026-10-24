(() => {
  const key = 'portfolio-theme';
  const tr = value => window.PortfolioI18n?.t(value) || value;
  const valid = value => value === 'dark' || value === 'light';
  let saved;
  try { saved = localStorage.getItem(key); } catch (_) {}
  let theme = valid(saved) ? saved : 'dark';

  function apply(value, persist = false) {
    if (!valid(value)) return;
    theme = value;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (persist) {
      try { localStorage.setItem(key, theme); } catch (_) {}
    }
    document.querySelectorAll('[data-set-theme]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme));
    });
    document.querySelectorAll('iframe').forEach(frame => {
      frame.contentWindow?.postMessage({ type: 'portfolio:theme', theme }, location.origin);
    });
  }

  apply(theme);
  addEventListener('storage', event => {
    if (event.key === key && valid(event.newValue)) apply(event.newValue);
  });
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'portfolio:theme') apply(event.data.theme);
  });
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLIFrameElement) {
      try {
        const title = event.target.contentDocument?.title;
        if (title) event.target.title = title;
      } catch (_) {}
      apply(theme);
    }
  }, true);

  function controls() {
    let host = document.getElementById('themeControls');
    if (!host && window.top === window.self) {
      host = document.createElement('div');
      host.id = 'themeControls';
      document.body.appendChild(host);
      if (location.pathname.includes('/sections/')) {
        const back = document.createElement('a');
        back.className = 'standalone-back';
        back.href = '../index.html';
        back.setAttribute('data-i18n-ignore', '');
        back.innerHTML = '<span class="bd" aria-hidden="true"></span><span class="return-label"></span>';
        document.body.appendChild(back);
        window.PortfolioI18n?.apply(back);
      }
    }
    if (host) {
      host.className = 'theme-controls';
      host.setAttribute('role', 'group');
      host.setAttribute('data-i18n-ignore', '');
      host.setAttribute('aria-label', tr('页面颜色与语言'));
      host.innerHTML = '<button type="button" data-set-theme="dark" aria-label="黑色模式" title="黑色模式"><span class="theme-dot dark-dot" aria-hidden="true"></span></button><button type="button" data-set-theme="light" aria-label="白色模式" title="白色模式"><span class="theme-dot light-dot" aria-hidden="true"></span></button>';
      const languageButton = document.createElement('button');
      languageButton.type = 'button';
      languageButton.className = 'language-toggle';
      languageButton.addEventListener('click', () => window.PortfolioI18n?.setLanguage(window.PortfolioI18n.language === 'en' ? 'zh' : 'en'));
      host.appendChild(languageButton);
      host.querySelectorAll('[data-set-theme]').forEach(button => {
        button.addEventListener('click', () => apply(button.dataset.setTheme, true));
      });
    }
    updateLanguageControls();
    apply(theme);
  }
  function updateLanguageControls() {
    const back = document.querySelector('.standalone-back');
    if (back) {
      const english = window.PortfolioI18n?.language === 'en';
      const practiceDetail=['arright.html','drift.html','design-skills.html','more.html'].includes(location.pathname.split('/').pop());
      const label = practiceDetail ? (english ? 'Back to Practice' : '返回练习') : (english ? 'Back to works' : '返回作品集');
      back.setAttribute('aria-label', label); back.title = label;
      back.querySelector('.return-label').textContent = label;
      back.setAttribute('href', (practiceDetail ? 'practice.html?lang=' : '../index.html?lang=') + (english ? 'en' : 'zh') + (practiceDetail ? '' : '#works'));
    }
    const host = document.getElementById('themeControls');
    if (!host) return;
    host.setAttribute('aria-label', tr('页面颜色与语言'));
    host.querySelectorAll('[data-set-theme]').forEach(button => {
      const label = tr(button.dataset.setTheme === 'dark' ? '黑色模式' : '白色模式');
      button.setAttribute('aria-label', label); button.title = label;
    });
    const button = host.querySelector('.language-toggle');
    if (button) {
      const english = window.PortfolioI18n?.language === 'en';
      button.textContent = english ? '中' : 'EN';
      button.setAttribute('aria-label', english ? 'Switch to Chinese' : '切换到英文');
      button.title = button.getAttribute('aria-label');
    }
  }
  addEventListener('portfolio:language', updateLanguageControls);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controls);
  else controls();
})();
