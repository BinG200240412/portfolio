(() => {
  const key = 'portfolio-theme';
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
        back.textContent = '← 作品';
        document.body.appendChild(back);
      }
    }
    if (host) {
      host.className = 'theme-controls';
      host.setAttribute('role', 'group');
      host.setAttribute('aria-label', '页面颜色');
      host.innerHTML = '<button type="button" data-set-theme="dark" aria-label="黑色模式" title="黑色模式"><span class="theme-dot dark-dot" aria-hidden="true"></span></button><button type="button" data-set-theme="light" aria-label="白色模式" title="白色模式"><span class="theme-dot light-dot" aria-hidden="true"></span></button>';
      host.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => apply(button.dataset.setTheme, true));
      });
    }
    apply(theme);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controls);
  else controls();
})();
