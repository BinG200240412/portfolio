/* Small interaction studies for the case page, not a Sudoku solver or App replay. */
(() => {
  'use strict';
  const refreshers = [];
  const english = () => window.PortfolioI18n?.language
    ? window.PortfolioI18n.language === 'en'
    : /^en\b/i.test(document.documentElement.lang);
  const messages = {
    select: (en, row, col) => en ? `Selected row ${row}, column ${col}.` : `已选择第${row}行第${col}格。`,
    fill: (en, digit) => en ? `Entered ${digit}.` : `已填入${digit}。`,
    note: (en, notes) => en ? `Candidates: ${notes}.` : `候选数：${notes}。`,
    clearNote: en => en ? 'Candidates cleared.' : '已清除候选数。',
    undo: en => en ? 'Previous state restored.' : '已恢复上一步状态。',
    reset: en => en ? 'Interaction study reset.' : '交互示意已重置。',
    coach: (en, step) => en ? `Coaching design layer ${step} of 3.` : `已切换到辅导解读第${step}层，共3层。`,
  };

  function announcer(root, attribute) {
    let node = root.querySelector(`[${attribute}]`);
    if (!node) {
      node = document.createElement('p');
      node.setAttribute(attribute, '');
      root.append(node);
    }
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    node.setAttribute('data-i18n-ignore', '');
    let last = null;
    const refresh = () => {
      if (last) node.textContent = messages[last.key](english(), ...last.values);
    };
    refreshers.push(refresh);
    return (key, ...values) => { last = { key, values }; refresh(); };
  }

  const digit = value => /^[1-9]$/.test(String(value ?? '').trim()) ? String(value).trim() : '';
  const clone = state => ({ selected: state.selected, cells: state.cells.map(cell => ({ ...cell })) });

  function board(root) {
    const buttons = [...root.querySelectorAll('button[data-demo-cell]')]
      .filter(button => /^[0-8]$/.test(button.dataset.demoCell))
      .sort((a, b) => Number(a.dataset.demoCell) - Number(b.dataset.demoCell));
    if (buttons.length !== 9 || new Set(buttons.map(button => button.dataset.demoCell)).size !== 9) return;
    const spans = buttons.map(button => ({ value: button.querySelector('.demo-value'), notes: button.querySelector('.demo-notes') }));
    if (spans.some(span => !span.value || !span.notes)) return;
    let initial = [];
    if (root.dataset.initial) {
      try { initial = JSON.parse(root.dataset.initial); } catch (_) {}
      if (!Array.isArray(initial)) initial = /^[0-9]{9}$/.test(root.dataset.initial) ? [...root.dataset.initial] : root.dataset.initial.split(/[\s,]+/);
      if (!Array.isArray(initial) || initial.length !== 9) initial = [];
    }
    const givens = buttons.map((button, index) => digit(button.hasAttribute('data-initial') ? button.dataset.initial : initial[index]));
    const fill = digit(root.dataset.demoFill) || '5';
    const configuredNotes = [...new Set((root.dataset.demoNote || '2 5').split(/[\s,]+/).map(digit).filter(Boolean))];
    const notes = (configuredNotes.length ? configuredNotes : ['2', '5']).join(' ');
    const baseline = { selected: 4, cells: givens.map(value => ({ value, notes: false })) };
    let state = clone(baseline);
    const history = [];
    const actions = [...root.querySelectorAll('button[data-demo-action]')];
    const reset = root.querySelector('button[data-demo-reset]');
    const announce = announcer(root, 'data-demo-status');
    const remember = () => { history.push(clone(state)); if (history.length > 64) history.shift(); };

    function render() {
      buttons.forEach((button, index) => {
        const cell = state.cells[index], selected = state.selected === index;
        spans[index].value.textContent = cell.value;
        spans[index].notes.textContent = cell.notes ? notes : '';
        button.setAttribute('aria-pressed', String(selected));
        button.setAttribute('data-i18n-ignore', '');
        const row = Math.floor(index / 3) + 1, col = index % 3 + 1;
        const content = cell.value || (cell.notes ? (english() ? `candidates ${notes}` : `候选数${notes}`) : (english() ? 'empty' : '空格'));
        button.setAttribute('aria-label', english()
          ? `Row ${row}, column ${col}, ${content}${givens[index] ? ', fixed digit' : ''}${selected ? ', selected' : ''}`
          : `第${row}行第${col}格，${content}${givens[index] ? '，固定数字' : ''}${selected ? '，已选中' : ''}`);
      });
      const cell = state.cells[state.selected];
      actions.forEach(button => {
        if (button.dataset.demoAction === 'undo') button.disabled = !history.length;
        if (button.dataset.demoAction === 'fill') button.disabled = Boolean(givens[state.selected]) || cell.value === fill;
        if (button.dataset.demoAction === 'note') button.disabled = Boolean(givens[state.selected] || cell.value);
      });
      if (reset) reset.disabled = !history.length && JSON.stringify(state) === JSON.stringify(baseline);
    }

    buttons.forEach((button, index) => button.addEventListener('click', () => {
      if (state.selected === index) return;
      state.selected = index;
      render();
      announce('select', Math.floor(index / 3) + 1, index % 3 + 1);
    }));
    actions.forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.demoAction, cell = state.cells[state.selected];
      if (action === 'undo') {
        if (!history.length) return;
        state = history.pop();
        render(); announce('undo'); return;
      }
      if (givens[state.selected]) return;
      if (action === 'fill') {
        if (cell.value === fill) return;
        remember(); cell.value = fill; cell.notes = false;
      } else if (action === 'note') {
        if (cell.value) return;
        remember(); cell.notes = !cell.notes;
      } else return;
      render();
      announce(action === 'fill' ? 'fill' : cell.notes ? 'note' : 'clearNote', action === 'fill' ? fill : notes);
    }));
    reset?.addEventListener('click', () => {
      if (!history.length && JSON.stringify(state) === JSON.stringify(baseline)) return;
      state = clone(baseline); history.length = 0;
      render(); announce('reset');
    });
    refreshers.push(render);
    render();
  }

  function coach(root) {
    const buttons = [...root.querySelectorAll('button[data-coach-step]')]
      .filter(button => /^[0-2]$/.test(button.dataset.coachStep));
    const panels = [...root.querySelectorAll('[data-coach-panel]')];
    if (!buttons.length) return;
    let step = buttons.some(button => button.dataset.coachStep === root.dataset.step) ? root.dataset.step : buttons[0].dataset.coachStep;
    const announce = announcer(root, 'data-coach-status');
    function render() {
      root.dataset.step = step;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.coachStep === step)));
      panels.forEach(panel => { panel.hidden = panel.dataset.coachPanel !== step; });
    }
    buttons.forEach(button => button.addEventListener('click', () => {
      if (button.dataset.coachStep === step) return;
      step = button.dataset.coachStep; render(); announce('coach', Number(step) + 1);
    }));
    render();
  }

  function init() {
    document.querySelectorAll('[data-sudoku-demo]').forEach(board);
    document.querySelectorAll('[data-coach-demo]').forEach(coach);
    addEventListener('portfolio:language', () => refreshers.forEach(refresh => refresh()));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
