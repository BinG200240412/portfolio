(() => {
  const key = 'portfolio-theme';
  const requestedFont = new URL(location.href).searchParams.get('cjk');
  const fontPreview = ['plix', 'plix-extra'].includes(requestedFont) ? requestedFont : null;
  if (fontPreview) document.documentElement.dataset.cjkPreview = fontPreview;
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
    updateThemeControl();
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

  function updateThemeControl() {
    const english = window.PortfolioI18n?.language === 'en';
    const label = theme === 'dark'
      ? (english ? 'Switch to light appearance' : '切换到白色模式')
      : (english ? 'Switch to dark appearance' : '切换到黑色模式');
    document.querySelectorAll('[data-toggle-theme]').forEach(button => {
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  }

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
      host.innerHTML = '<button type="button" class="appearance-toggle" data-toggle-theme><svg class="appearance-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor"/><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.25"/></svg></button>';
      host.querySelector('[data-toggle-theme]').addEventListener('click', () => apply(theme === 'dark' ? 'light' : 'dark', true));
      const languageButton = document.createElement('button');
      languageButton.type = 'button';
      languageButton.className = 'language-toggle';
      languageButton.innerHTML = '<span class="language-option" data-language="zh" lang="zh-CN" aria-hidden="true">中</span><span class="language-divider" aria-hidden="true">/</span><span class="language-option" data-language="en" lang="en" aria-hidden="true">EN</span>';
      languageButton.addEventListener('click', () => window.PortfolioI18n?.setLanguage(window.PortfolioI18n.language === 'en' ? 'zh' : 'en'));
      host.appendChild(languageButton);
    }
    updateLanguageControls();
    apply(theme);
  }
  function updateLanguageControls() {
    const back = document.querySelector('.standalone-back');
    if (back) {
      const english = window.PortfolioI18n?.language === 'en';
      const practiceDetail=['arright.html','drift.html'].includes(location.pathname.split('/').pop());
      const label = practiceDetail ? (english ? 'Back to Practice' : '返回练习') : (english ? 'Back to works' : '返回作品集');
      back.setAttribute('aria-label', label); back.title = label;
      back.querySelector('.return-label').textContent = label;
      back.setAttribute('href', (practiceDetail ? 'practice.html?lang=' : '../index.html?lang=') + (english ? 'en' : 'zh') + (practiceDetail ? '' : '#works'));
      if (fontPreview) {
        const previewURL = new URL(back.getAttribute('href'), location.href);
        previewURL.searchParams.set('cjk', fontPreview);
        back.setAttribute('href', previewURL.pathname + previewURL.search + previewURL.hash);
      }
    }
    const host = document.getElementById('themeControls');
    if (!host) return;
    host.setAttribute('aria-label', tr('页面颜色与语言'));
    updateThemeControl();
    const button = host.querySelector('.language-toggle');
    if (button) {
      const english = window.PortfolioI18n?.language === 'en';
      button.querySelectorAll('[data-language]').forEach(option => {
        option.classList.toggle('is-current', option.dataset.language === (english ? 'en' : 'zh'));
      });
      button.setAttribute('aria-label', english ? 'Switch to Chinese' : '切换到英文');
      button.title = button.getAttribute('aria-label');
    }
  }
  addEventListener('portfolio:language', updateLanguageControls);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controls);
  else controls();
})();

/* A single-column LED shaft with a thin, open arrowhead. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const patterns = ['0001000','0001000','0001000','1001001','0101010','0011100','0001000'];
  function mount() {
    const file = location.pathname.split('/').pop() || 'index.html';
    const definitions = {
      'sudoku.html': ['.sudoku-opening > .hero', '#intent', '--accent', 'center'],
      'ai3d.html': ['#liangzhu-particle-cover', '.wrap .intro', '--cover-accent', 'right'],
      'qianli.html': ['.qianli-light-hero', '.wrap .intro', '--jade', 'right'],
      'xr.html': ['.gogo-hero', '#concept', '--gogo-accent', 'center'],
      'drift.html': ['body > .hero', '.wrap .intro', '--green', 'right'],
      'design-skills.html': ['.skills-hero', '#newsprint', '--red', 'inline'],
      'arright.html': ['.wrap .hero', null, '--ink', 'center'],
      'index.html': ['.about-hero', '.about-details', '--red', 'center'],
    };
    const definition = definitions[file];
    if (!definition) return;
    const [selector, destination, accent, position] = definition;
    const hero = document.querySelector(selector);
    const destinationNode = destination ? document.querySelector(destination) : hero?.nextElementSibling;
    const heroPage = hero?.closest('.portfolio-snap-page');
    let target = destinationNode?.closest('.portfolio-snap-page') || destinationNode;
    if (heroPage && target === heroPage) target = heroPage.nextElementSibling;
    if (!hero || !target) return;
    const cue = document.createElement('button');
    cue.type = 'button'; cue.className = 'scroll-cue'; cue.hidden = true;
    cue.dataset.position = position; cue.dataset.i18nIgnore = '';
    const pixels = document.createElement('span');
    pixels.className = 'scroll-cue-pixels'; pixels.setAttribute('aria-hidden', 'true');
    patterns.forEach((row, y) => [...row].forEach((value, x) => {
      if (value !== '1') return;
      const dot = document.createElement('i'); dot.className = 'scroll-cue-led';
      dot.style.gridColumn = String(x + 1); dot.style.gridRow = String(y + 1);
      dot.style.setProperty('--led-row', String(y)); pixels.append(dot);
    }));
    cue.append(pixels);
    if (!target.id) target.id = 'scroll-cue-destination';
    cue.setAttribute('aria-controls', target.id);
    cue.addEventListener('click', () => target.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' }));
    (position === 'inline' ? hero : document.body).append(cue);
    let pending = 0;
    function update() {
      pending = 0;
      const english = window.PortfolioI18n?.language === 'en';
      const label = english ? 'Scroll down to explore' : '向下浏览';
      cue.setAttribute('aria-label', label); cue.title = label;
      const style = getComputedStyle(hero);
      cue.style.color = style.getPropertyValue('--scroll-cue-accent').trim() || style.getPropertyValue(accent).trim() || 'var(--ink)';
      cue.dataset.paused = String(document.hidden);
      const rect = hero.getBoundingClientRect(), next = target.getBoundingClientRect();
      const visible = position === 'inline'
        ? true
        : rect.top > -96 && rect.top < innerHeight * .45 && rect.bottom > innerHeight * .7
          && next.top > innerHeight * .9 && document.documentElement.scrollHeight > innerHeight + 40;
      cue.hidden = !visible;
      if (position === 'inline') cue.dataset.paused = String(document.hidden || rect.bottom < 0 || rect.top > innerHeight);
      if (!visible || position === 'inline') return;
      // Use the viewport centre even when the cover's composition is right-aligned.
      const left = position === 'right' ? innerWidth - Math.max(18, Math.min(44, innerWidth * .04)) - 48 : innerWidth / 2 - 24;
      let bottom = Math.max(22, Math.min(34, innerHeight * .035));
      const obstacles = Array.from(hero.querySelectorAll('.hero-foot,.gogo-chapter-nav,.gogo-opening>p,.gogo-opening>span,.gogo-project-name'), node => node.getBoundingClientRect())
        .filter(foot => foot.width > 0 && foot.height > 0 && foot.left < left + 48 && foot.right > left);
      // Moving above one line can reach another. Each pass moves upward past
      // one obstacle, so the number of obstacles also bounds the recheck.
      for (let pass = 0; pass < obstacles.length; pass++) {
        const edge = innerHeight - bottom;
        const foot = obstacles.find(item => item.top < edge && item.bottom > edge - 52);
        if (!foot) break;
        bottom = innerHeight - foot.top + 12;
      }
      if (innerHeight - bottom - 52 < 12) { cue.hidden = true; return; }
      cue.style.left = `${left}px`; cue.style.bottom = `${bottom}px`;
    }
    function queue() { if (!pending) pending = requestAnimationFrame(update); }
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue, { passive: true });
    addEventListener('load', queue);
    addEventListener('portfolio:language', queue); addEventListener('portfolio:navigation', queue);
    document.addEventListener('visibilitychange', queue);
    new MutationObserver(queue).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(queue); observer.observe(hero); observer.observe(target);
    }
    document.fonts?.ready.then(queue);
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
