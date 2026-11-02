/* Local copy stays outside the shared case dictionary. */
(() => {
  'use strict';
  const copy = {
    zh: {
      title: 'Practice — Cai Zhengyang',
      description: '蔡正阳的创作练习：arright 与心·境·声。',
      arrightLink: '查看 arright',
      arrightAlt: 'arright 的住宅平面图与摆放推理界面',
      arrightIntro: '把物品放到合适的位置，让一个场景成立的排列推理游戏。',
      xjsLink: '查看心·境·声',
      xjsAlt: '心·境·声：钟体与水面的涟漪意象',
      xjsTitle: '心·境·声',
      xjsIntro: '把心率转为钟声与水纹的交互装置。'
    },
    en: {
      title: 'Practice — Cai Zhengyang',
      description: 'Creative exercises by Cai Zhengyang: arright and Heart · Space · Sound.',
      arrightLink: 'View arright',
      arrightAlt: 'A floor plan and furniture-placement puzzle in arright',
      arrightIntro: 'A spatial puzzle about arranging objects so a room works.',
      xjsLink: 'View Heart · Space · Sound',
      xjsAlt: 'A bell and ripples: the visual intent for Heart · Space · Sound',
      xjsTitle: 'Heart · Space · Sound',
      xjsIntro: 'An interactive installation translating heart-rate data into bell sounds and ripples.'
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
