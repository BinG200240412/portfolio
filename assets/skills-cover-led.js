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
    function rect(x, y, w, h, role) {
      for (let row = y; row < y + h; row++) {
        for (let column = x; column < x + w; column++) cell(column, row, role);
      }
    }
    function beam(x0, y0, x1, y1, thickness, role) {
      for (let offset = 0; offset < thickness; offset++) line(x0, y0 + offset, x1, y1 + offset, role);
    }

    const signWidth = Math.max(35, Math.floor(width * .84));
    const signHeight = Math.max(19, Math.floor(signWidth * .45));
    const left = Math.max(1, Math.floor((width - signWidth) / 2) - 1);
    const right = left + signWidth - 1;
    const top = Math.max(15, Math.floor(height * .60 - signHeight / 2));
    const bottom = top + signHeight - 1;
    const wall = Math.min(width - 5, right + 2);
    const armY = Math.max(4, top - Math.max(9, Math.floor(signWidth * .19)));
    const hookInset = Math.max(5, Math.floor(signWidth * .16));
    const hookXs = [left + hookInset, right - hookInset];

    // Steel bracket, mounting plate and short hangers have real pixel thickness.
    rect(wall, armY - 4, 5, 18, 0);
    rect(wall, armY - 4, 2, 18, 2);
    rect(wall + 2, armY - 2, 1, 1, 1);
    rect(wall + 2, armY + 10, 1, 1, 1);
    beam(hookXs[0] - 3, armY, wall, armY, 3, 0);
    beam(hookXs[0] - 3, armY, wall, armY, 1, 1);
    beam(wall - Math.max(8, Math.floor(signWidth * .24)), armY + 3, wall - 1, armY + 10, 3, 0);
    for (const x of hookXs) {
      rect(x - 1, armY + 3, 2, Math.max(1, top - armY - 5), 2);
      rect(x - 2, top - 3, 4, 3, 0);
      rect(x - 1, top - 2, 2, 2, 1);
    }
    // The lower/right return and a continuous frame turn the outline into a box.
    for (let inset = 0; inset < 4; inset++) outline(left + 3 + inset, top + 3 + inset, right + 3 - inset, bottom + 3 - inset, 0);
    for (let inset = 0; inset < 3; inset++) outline(left + inset, top + inset, right - inset, bottom - inset, inset === 0 ? 1 : 0);
    outline(left + 3, top + 3, right - 3, bottom - 3, 2);
    for (const x of [left + 4, right - 4]) {
      cell(x, top + 4, 1);
      cell(x, bottom - 4, 1);
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

    const letterScale = Math.max(1, Math.min(3, Math.floor((signWidth - 10) / 29)));
    const textWidth = 29 * letterScale;
    const textX = left + Math.floor((signWidth - textWidth) / 2);
    const textY = top + Math.floor((signHeight - 7 * letterScale) / 2) - letterScale;
    const letters = 'SKILL'.split('').map((letter, index) => ({
      rows: glyphs[letter], x: textX + index * 6 * letterScale,
      y: textY, scale: letterScale,
    }));
    cached = { width, height, staticCells, perimeter, letters, barY: bottom - Math.max(5, letterScale * 2), panel: [left + 4, top + 4, signWidth - 8, signHeight - 8] };
    return cached;
  }

  window.PortfolioCoverDots.register('skills', frame => {
    const width = Math.floor(frame.width), height = Math.floor(frame.height);
    if (width < 40 || height < 40) return;
    const { ctx, colors } = frame;
    const time = frame.reduced ? 0 : frame.time;
    const model = layout(width, height);
    ctx.globalAlpha = .2;
    ctx.fillStyle = colors[0];
    ctx.fillRect(...model.panel);
    ctx.globalAlpha = 1;
    model.staticCells.forEach((cells, role) => {
      ctx.fillStyle = colors[role];
      for (const id of cells) ctx.fillRect(id % width, Math.floor(id / width), 1, 1);
    });

    // Light travels along existing border cells; no bulb or geometry translates.
    const head = Math.floor(time * 8) % model.perimeter.length;
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
