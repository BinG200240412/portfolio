/* The original iPad web games are loaded only on request and disposed on close. */
(() => {
  'use strict';
  const dialog = document.getElementById('tea-game-viewer');
  const mount = dialog.querySelector('.tea-game-mount');
  const tabs = [...document.querySelectorAll('[data-tea-stage]')];
  const known = new Set(tabs.map(tab => tab.dataset.teaStage));
  let opener;
  function select(tab, focus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', active); item.tabIndex = active ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {event.preventDefault(); select(tabs[next], true);}
    });
  });
  function fit() {
    const frame = mount.querySelector('iframe');
    if (!frame) return;
    const w = mount.clientWidth, h = mount.clientHeight;
    const width = Math.max(960, w);
    const height = w < h ? 600 : Math.max(420, h * width / w);
    frame.style.width = `${width}px`; frame.style.height = `${height}px`;
    frame.style.transform = `translate(-50%, -50%) scale(${Math.min(w / width, h / height)})`;
  }
  new ResizeObserver(fit).observe(mount);
  function load(stage, auto = false) {
    if (!known.has(stage) && stage !== 'index') return;
    mount.replaceChildren();
    const frame = document.createElement('iframe');
    frame.title = 'Tea String Chronicles — interactive browser demo';
    frame.setAttribute('data-i18n-ignore', '');
    frame.src = `../assets/works/tea/play/${stage}.html${auto ? '?auto' : ''}`;
    frame.allow = 'autoplay; fullscreen'; frame.allowFullscreen = true;
    mount.append(frame); fit();
  }
  function open(stage, auto, button) {
    opener = button;
    document.documentElement.classList.add('tea-game-open');
    dialog.showModal(); load(stage, auto);
  }
  document.querySelectorAll('[data-tea-launch]').forEach(button => button.addEventListener('click', () => open(button.dataset.teaLaunch, false, button)));
  document.querySelector('[data-tea-auto]').addEventListener('click', event => open('chazhan', true, event.currentTarget));
  dialog.querySelector('[data-tea-menu]').addEventListener('click', () => load('index'));
  dialog.querySelector('[data-tea-game-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-tea-fullscreen]').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await dialog.requestFullscreen(); } catch (_) {}
  });
  dialog.addEventListener('close', () => {
    mount.replaceChildren(); document.documentElement.classList.remove('tea-game-open');
    if (document.fullscreenElement === dialog) document.exitFullscreen().catch(() => {});
    opener?.focus({preventScroll:true});
  });
  addEventListener('message', event => {
    if (event.origin === location.origin && event.source === mount.querySelector('iframe')?.contentWindow && event.data?.type === 'tea:close') dialog.close();
  });
  addEventListener('pagehide', () => { if (dialog.open) dialog.close(); });
})();
