/* Local copy stays outside the shared case dictionary. */
(() => {
  'use strict';
  const copy = {
    zh: {
      title: 'Practice — Cai Zhengyang',
      description: '蔡正阳的创作练习：arright 与漂移之屋。',
      arrightLink: '查看 arright',
      arrightAlt: 'arright 的住宅平面图与摆放推理界面',
      arrightIntro: '把物品放到合适的位置，让一个场景成立的排列推理游戏。',
      driftLink: '查看漂移之屋',
      driftAlt: '漂移之屋的鱼眼视角房间与佩戴 MR 头显的体验者',
      driftTitle: '漂移之屋',
      driftIntro: '让无意识的动作慢慢改变房间的 MR 装置概念。',
      resources: '更多作品与资源',
      archive: '旧作品集'
    },
    en: {
      title: 'Practice — Cai Zhengyang',
      description: 'Creative exercises by Cai Zhengyang: arright and The Drift.',
      arrightLink: 'View arright',
      arrightAlt: 'A floor plan and furniture-placement puzzle in arright',
      arrightIntro: 'A spatial puzzle about arranging objects so a room works.',
      driftLink: 'View The Drift',
      driftAlt: 'A fisheye view of The Drift room and a participant wearing an MR headset',
      driftTitle: 'The Drift',
      driftIntro: 'An MR installation concept where unconscious actions gradually change a room.',
      resources: 'More work and resources',
      archive: 'Earlier portfolio'
    }
  };

  function render() {
    const language = window.PortfolioI18n?.language === 'en' ? 'en' : 'zh';
    const text = copy[language];
    document.title = text.title;
    document.querySelector('[data-practice-description]')?.setAttribute('content', text.description);
    document.querySelectorAll('[data-practice-text]').forEach(node => {
      node.textContent = text[node.dataset.practiceText];
    });
    document.querySelectorAll('[data-practice-alt]').forEach(node => {
      node.alt = text[node.dataset.practiceAlt];
    });
    document.querySelectorAll('[data-practice-aria]').forEach(node => {
      node.setAttribute('aria-label', text[node.dataset.practiceAria]);
    });
    document.querySelectorAll('[data-practice-link]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      url.searchParams.set('lang', language);
      link.setAttribute('href', url.pathname + url.search + url.hash);
    });
  }

  addEventListener('portfolio:language', render);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
