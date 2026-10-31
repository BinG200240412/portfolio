/* Fixed LED-screen content. Every coordinate below is an integer buffer cell;
 * the shared runtime alone determines the equal-size hardware bulbs. */
(() => {
  'use strict';
  const glyphs = {
    S: ['01110','11001','11000','01110','00011','10011','01110'],
    K: ['11001','11011','11110','11100','11110','11011','11001'],
    I: ['11111','00100','00100','00100','00100','00100','11111'],
    L: ['11000','11000','11000','11000','11000','11000','11111'],
  };
  let cached = null;

  function layout(width, height) {
    if (cached && cached.width === width && cached.height === height) return cached;
    const staticCells = [new Set(), new Set(), new Set()];
    function cell(x, y, role) {
      if (x >= 0 && y >= 0 && x < width && y < height) staticCells[role].add(y * width + x);
    }
    function line(x0, y0, x1, y1, role) {
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let error = dx + dy;
      while (true) {
        cell(x0, y0, role);
        if (x0 === x1 && y0 === y1) break;
        const twice = 2 * error;
        if (twice >= dy) { error += dy; x0 += sx; }
        if (twice <= dx) { error += dx; y0 += sy; }
      }
    }
    function outline(left, top, right, bottom, role) {
      line(left + 2, top, right - 2, top, role);
      cell(right - 1, top + 1, role);
      line(right, top + 2, right, bottom - 2, role);
      cell(right - 1, bottom - 1, role);
      line(right - 2, bottom, left + 2, bottom, role);
      cell(left + 1, bottom - 1, role);
      line(left, bottom - 2, left, top + 2, role);
      cell(left + 1, top + 1, role);
    }

    const signWidth = Math.max(35, Math.floor(width * .84));
    const signHeight = Math.max(17, Math.floor(signWidth * .43));
    const left = Math.floor((width - signWidth) / 2);
    const right = left + signWidth - 1;
    const top = Math.max(15, Math.floor(height * .60 - signHeight / 2));
    const bottom = top + signHeight - 1;
    const wall = Math.min(width - 3, right + 3);
    const armY = Math.max(4, top - Math.floor(signWidth * .27));
    const hookInset = Math.max(5, Math.floor(signWidth * .16));
    const hookXs = [left + hookInset, right - hookInset];

    // The bracket and sign never move. Only their fixed cells change colour.
    line(wall, armY - 3, wall, armY + 9, 2);
    line(wall + 1, armY - 3, wall + 1, armY + 9, 0);
    line(hookXs[0] - 2, armY, wall - 1, armY, 1);
    line(wall - 1, armY + 7, wall - Math.max(7, Math.floor(signWidth * .23)), armY + 1, 0);
    for (const x of hookXs) {
      line(x, armY + 1, x, top - 6, 2);
      outline(x - 1, top - 5, x + 1, top - 2, 2);
      cell(x, top - 1, 1);
    }
    // One-cell side and a quieter inset keep the plaque precise and pixel-native.
    outline(left + 1, top + 1, right + 1, bottom + 1, 0);
    outline(left, top, right, bottom, 1);
    outline(left + 3, top + 3, right - 3, bottom - 3, 0);
    for (const x of [left + 3, right - 3]) {
      cell(x, top + 3, 2);
      cell(x, bottom - 3, 2);
    }

    const perimeter = [];
    for (let x = left + 2; x <= right - 2; x++) perimeter.push([x, top]);
    perimeter.push([right - 1, top + 1]);
    for (let y = top + 2; y <= bottom - 2; y++) perimeter.push([right, y]);
    perimeter.push([right - 1, bottom - 1]);
    for (let x = right - 2; x >= left + 2; x--) perimeter.push([x, bottom]);
    perimeter.push([left + 1, bottom - 1]);
    for (let y = bottom - 2; y >= top + 2; y--) perimeter.push([left, y]);
    perimeter.push([left + 1, top + 1]);

    const letterScale = Math.max(1, Math.min(3, Math.floor((signWidth - 8) / 33)));
    const textWidth = 33 * letterScale;
    const textX = left + Math.floor((signWidth - textWidth) / 2);
    const textY = top + Math.floor((signHeight - 7 * letterScale) / 2) - letterScale;
    const letters = 'SKILL'.split('').map((letter, index) => ({
      rows: glyphs[letter], x: textX + index * 7 * letterScale,
      y: textY, scale: letterScale,
    }));
    cached = { width, height, staticCells, perimeter, letters, barY: bottom - Math.max(4, letterScale * 2) };
    return cached;
  }

  window.PortfolioCoverDots.register('skills', frame => {
    const width = Math.floor(frame.width), height = Math.floor(frame.height);
    if (width < 40 || height < 40) return;
    const { ctx, colors } = frame;
    const time = frame.reduced ? 0 : frame.time;
    const model = layout(width, height);
    ctx.globalAlpha = 1;
    model.staticCells.forEach((cells, role) => {
      ctx.fillStyle = colors[role];
      for (const id of cells) ctx.fillRect(id % width, Math.floor(id / width), 1, 1);
    });

    // Light travels along existing border cells; no bulb or geometry translates.
    const head = Math.floor(time * 11) % model.perimeter.length;
    const tail = frame.reduced ? 1 : 6;
    ctx.fillStyle = colors[3];
    for (let i = 0; i < tail; i++) {
      const [x, y] = model.perimeter[(head - i + model.perimeter.length) % model.perimeter.length];
      ctx.fillRect(x, y, 1, 1);
    }
    const liveLetter = frame.reduced ? -1 : Math.floor(time * .65) % 5;
    model.letters.forEach((letter, index) => {
      const active = index === liveLetter;
      ctx.fillStyle = colors[active ? 3 : 1];
      letter.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '1') ctx.fillRect(letter.x + x * letter.scale, letter.y + y * letter.scale, letter.scale, letter.scale);
        }
      });
      ctx.fillStyle = colors[active ? 3 : 2];
      ctx.fillRect(letter.x, model.barY, 5 * letter.scale, 1);
    });
  });
})();
