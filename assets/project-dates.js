/* Author-confirmed project starts, in YYYY-MM. Unknown dates stay absent. */
(() => {
  'use strict';
  const starts = {
    'sudoku': '2026-04',
    'gogo': '2025-10',
    'tea': '2026-07',
    'arright': '2026-10',
    'ai3d': '2025-10',
    'qianli': '2022-12',
    'skills-print': '2026-06',
    'skills-icons': '2026-06',
    'skills-ui': '2026-08',
    'drift': '2025-11'
  };
  function render() {
    document.querySelectorAll('time[data-project-start]').forEach(time => {
      const value = starts[time.dataset.projectStart];
      const valid = typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
      time.hidden = !valid;
      if (!valid) return;
      time.dateTime = value;
      time.textContent = value.replace('-', '.');
    });
    document.querySelectorAll('.project-start-row').forEach(row => {
      row.hidden = !row.querySelector('time[data-project-start]:not([hidden])');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();
