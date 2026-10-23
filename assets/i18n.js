/* One language state for the shell, standalone pages and same-origin project frames. */
(() => {
  'use strict';
  const key = 'portfolio-language';
  const valid = value => value === 'zh' || value === 'en';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const dictionary = Object.assign({}, window.PORTFOLIO_CASE_TRANSLATIONS, window.PORTFOLIO_TRANSLATIONS);
  const reverse = new Map();
  Object.entries(dictionary).forEach(([source, translated]) => {
    if (!reverse.has(normalize(translated))) reverse.set(normalize(translated), source);
  });
  const sourceOf = (value, element) => element?.closest('.media-viewer') ? reverse.get(normalize(value)) || value : value;
  const textState = new WeakMap(), attributeState = new WeakMap();
  const attrs = ['alt', 'title', 'aria-label', 'aria-description', 'placeholder', 'data-caption', 'content', 'download'];
  const ignored = 'script,style,code,pre,noscript,[data-i18n-ignore],#text,#menu';
  let saved;
  try { saved = localStorage.getItem(key); } catch (_) {}
  const requested = new URL(location.href).searchParams.get('lang');
  let language = valid(requested) ? requested : valid(saved) ? saved : 'zh';
  let observer;
  const t = source => language === 'en' ? dictionary[normalize(source)] ?? source : source;

  function applyText(node) {
    const raw = node.nodeValue;
    if (!raw.trim()) return;
    let state = textState.get(node);
    if (!state || raw !== state.last) state = { source: sourceOf(raw, node.parentElement), last: raw };
    const translated = t(state.source);
    // Chinese prose often touches inline <strong>/<em> elements without spaces.
    // Keep English word boundaries, then clean punctuation at paragraph boundaries.
    const next = language === 'en' && translated !== state.source
      ? (/^[,.;:!?，。；：！？]/.test(translated) ? translated + ' ' : ' ' + translated + ' ')
      : state.source;
    if (raw !== next) node.nodeValue = next;
    state.last = next;
    textState.set(node, state);
  }

  function applyAttributes(element) {
    let states = attributeState.get(element);
    if (!states) { states = new Map(); attributeState.set(element, states); }
    attrs.forEach(name => {
      if (!element.hasAttribute(name)) return;
      if (name === 'content' && element.tagName !== 'META') return;
      const raw = element.getAttribute(name);
      let state = states.get(name);
      if (!state || raw !== state.last) state = { source: sourceOf(raw, element), last: raw };
      const next = t(state.source);
      if (raw !== next) element.setAttribute(name, next);
      state.last = next;
      states.set(name, state);
    });
    if (element.matches('a[href]')) {
      const raw = element.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;
      try {
        const url = new URL(raw, location.href);
        if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
        url.searchParams.set('lang', language);
        const next = url.pathname + url.search + url.hash;
        if (raw !== next) element.setAttribute('href', next);
      } catch (_) {}
    }
  }

  function cleanPunctuation(root) {
    if (language !== 'en') return;
    root.querySelectorAll('p,h1,h2,h3,h4,li,figcaption,blockquote,dd,dt').forEach(block => {
      if (block.closest(ignored)) return;
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let previous, node;
      while ((node = walker.nextNode())) {
        if (node.parentElement?.closest(ignored) || !node.nodeValue.trim()) continue;
        if (previous && /^\s*[,.;:!?]/.test(node.nodeValue)) {
          const next = previous.nodeValue.replace(/\s+$/, '');
          if (next !== previous.nodeValue) {
            previous.nodeValue = next;
            const state = textState.get(previous); if (state) state.last = next;
          }
        }
        previous = node;
      }
    });
  }

  function apply(root = document) {
    if (!root?.querySelectorAll) return;
    if (root.nodeType === 1 && root.closest(ignored)) return;
    if (root.nodeType === 1) applyAttributes(root);
    root.querySelectorAll('*').forEach(element => {
      if (!element.closest(ignored)) applyAttributes(element);
    });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement?.closest(ignored)) applyText(node);
    }
    cleanPunctuation(root);
  }

  function syncFrames() {
    document.querySelectorAll('iframe').forEach(frame => {
      frame.contentWindow?.postMessage({ type: 'portfolio:language', language }, location.origin);
      try { if (frame.contentDocument?.title) frame.title = frame.contentDocument.title; } catch (_) {}
    });
  }

  function setLanguage(value, persist = true) {
    if (!valid(value)) return;
    language = value;
    document.documentElement.lang = value === 'en' ? 'en' : 'zh-CN';
    document.documentElement.dataset.language = value;
    const url = new URL(location.href);
    url.searchParams.set('lang', value);
    try { history.replaceState(history.state, '', url); } catch (_) {}
    if (persist) try { localStorage.setItem(key, value); } catch (_) {}
    observer?.disconnect();
    apply();
    observe();
    dispatchEvent(new CustomEvent('portfolio:language', { detail: { language } }));
    syncFrames();
    if (window.parent !== window) {
      parent.postMessage({ type: 'portfolio:language-ready', language, title: document.title }, location.origin);
    }
  }

  function observe() {
    if (!observer || !document.body) return;
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attrs });
  }

  window.PortfolioI18n = { get language() { return language; }, setLanguage, t, apply };
  addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    if (event.data?.type === 'portfolio:language-ready' && event.data.language === language) {
      const frame = Array.from(document.querySelectorAll('iframe')).find(item => item.contentWindow === event.source);
      if (frame && typeof event.data.title === 'string') frame.title = event.data.title;
      return;
    }
    if (event.source !== parent) return;
    if (event.data?.type === 'portfolio:language' && valid(event.data.language) && event.data.language !== language) {
      setLanguage(event.data.language, false);
    }
  });
  addEventListener('storage', event => {
    if (event.key === key && valid(event.newValue) && event.newValue !== language) setLanguage(event.newValue, false);
  });
  addEventListener('popstate', () => {
    const value = new URL(location.href).searchParams.get('lang');
    if (valid(value) && value !== language) setLanguage(value);
  });
  document.addEventListener('load', event => {
    if (event.target instanceof HTMLIFrameElement) syncFrames();
  }, true);
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.documentElement.dataset.language = language;
  function ready() {
    // Observe only changed subtrees. Menu/typewriter updates are deliberately excluded.
    observer = new MutationObserver(records => {
      observer.disconnect();
      const roots = new Set();
      records.forEach(record => {
        const element = record.target.nodeType === 3 ? record.target.parentElement : record.target;
        if (!element || element.closest(ignored)) return;
        roots.add(element);
      });
      roots.forEach(root => apply(root));
      observe();
    });
    setLanguage(language);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
