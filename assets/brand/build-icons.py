#!/usr/bin/env python3
"""Build the native gorilla mark and its optically adjusted small icons.

Only circles/rectangles from GRID are rendered; no source image is sampled.
Requires Pillow. Run from any directory: python3 assets/brand/build-icons.py
"""
from io import BytesIO
from pathlib import Path
import shutil
import struct
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
GRID = (
    '................',
    '........KKKK....',
    '.......KKKKKK...',
    '......KKKKKKKK..',
    '......KKKK...K..',
    '.....KKKK..K.K..',
    '.....KKKKK...KK.',
    '....KKKKK.....K.',
    '...KKKKK.K..KKK.',
    '...KKKK..KKKKK..',
    '..KKKK...KKKK...',
    '..KKK...KKKKK...',
    '..KKK..KKKKKK...',
    '...KKRKKKKKKK...',
    '....KKKKKKKK....',
    '................',
)
PAPER, INK, REVERSE, RED, RED_REVERSE = '#f5f3ed', '#2f302c', '#efeee9', '#b35960', '#cf8184'
SMALL_INK = '#20211e'
CELLS = [(x, y, cell) for y, row in enumerate(GRID) for x, cell in enumerate(row) if cell != '.']
assert len(GRID) == 16 and all(len(row) == 16 for row in GRID)


def svg(*, reverse=False, adaptive=False):
    ink, red = (REVERSE, RED_REVERSE) if reverse else (SMALL_INK if adaptive else INK, RED)
    styles = f'.ink{{fill:{ink}}}.accent{{fill:{red}}}'
    if adaptive:
        styles += f'@media(prefers-color-scheme:dark){{.ink{{fill:{REVERSE}}}.accent{{fill:{RED_REVERSE}}}}}'
    radius = '.49' if adaptive else '.42'
    dots = '\n'.join(f'  <circle class="{"accent" if cell == "R" else "ink"}" cx="{x+.5:g}" cy="{y+.5:g}" r="{radius}"/>'
                     for x, y, cell in CELLS)
    size = 48 if adaptive else 1024
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 16 16" role="img" aria-labelledby="title desc">\n'
            '  <title id="title">BinG · 回头的猩猩</title>\n'
            '  <desc id="desc">回头向右的侧脸、斜向银背留白与后侧一颗暗红灯珠。</desc>\n'
            f'  <style>{styles}</style>\n{dots}\n</svg>\n')


def render(size, *, reverse=False, tile=False, opaque=False, optical=False, small=False):
    # Render the same vector cells at 8x, except for exact 1px optical hinting.
    factor = 1 if optical else 8
    image = Image.new('RGBA', (size * factor, size * factor), PAPER if opaque else (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    unit = size * factor / 16
    if tile:
        draw.rounded_rectangle((0, 0, size * factor - 1, size * factor - 1), radius=unit*2.5, fill=PAPER)
    for x, y, cell in CELLS:
        color = (RED_REVERSE if reverse else RED) if cell == 'R' else REVERSE if reverse else SMALL_INK if small else INK
        if optical:
            draw.rectangle((x * unit, y * unit, (x+1) * unit-1, (y+1) * unit-1), fill=color)
        else:
            inset = .01 if small else .08
            draw.ellipse(((x+inset)*unit, (y+inset)*unit, (x+1-inset)*unit, (y+1-inset)*unit), fill=color)
    return image if optical else image.resize((size, size), Image.Resampling.LANCZOS)


def write_ico(frames):
    payloads = []
    for image in frames:
        data = BytesIO()
        image.save(data, format='PNG', optimize=True)
        payloads.append(data.getvalue())
    output = bytearray(struct.pack('<HHH', 0, 1, len(frames)))
    offset = 6 + 16 * len(frames)
    for image, data in zip(frames, payloads):
        output += struct.pack('<BBBBHHII', image.width, image.height, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    (ROOT / 'favicon.ico').write_bytes(output + b''.join(payloads))


def font(size):
    for path in ('/System/Library/Fonts/Supplemental/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if Path(path).is_file():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def previews():
    sheet = Image.new('RGB', (960, 620), PAPER)
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((480, 0, 960, 620), fill='#171815')
    for x, reverse in ((80, False), (560, True)):
        sheet.paste(render(320, reverse=reverse), (x, 64), render(320, reverse=reverse))
        color = REVERSE if reverse else INK
        draw.text((x, 435), 'BinG', fill=color, font=font(32))
        draw.text((x, 490), 'Native dots / 16 x 16', fill=color, font=font(17))
    sheet.save(ROOT / 'logo-preview.png', optimize=True)

    tabs = Image.new('RGB', (960, 420), '#e3e3df')
    d = ImageDraw.Draw(tabs)
    d.text((30, 18), 'Actual 16px / 32px   ·   SVG and ICO fallback', font=font(21), fill=INK)
    for row, (dark, fallback) in enumerate(((False, False), (True, False), (False, True), (True, True))):
        y = 68 + row * 82
        background, foreground = ('#202124', '#efeee9') if dark else ('#ffffff', INK)
        d.rounded_rectangle((20, y, 940, y+66), radius=12, fill=background)
        d.text((40, y+24), ('Dark tab' if dark else 'Light tab') + (' · ICO' if fallback else ' · SVG'), font=font(16), fill=foreground)
        for size, x in ((16, 270), (32, 540)):
            icon = render(size, reverse=dark and not fallback, tile=fallback, optical=fallback and size == 16, small=True)
            tabs.paste(icon, (x, y + (66-size)//2), icon)
            d.text((x+size+14, y+24), 'Who am I · BinG', font=font(14), fill=foreground)
    tabs.save(ROOT / 'favicon-preview.png', optimize=True)


def main():
    (ROOT / 'logo.svg').write_text(svg(), encoding='utf-8')
    (ROOT / 'logo-reverse.svg').write_text(svg(reverse=True), encoding='utf-8')
    (ROOT / 'favicon.svg').write_text(svg(adaptive=True), encoding='utf-8')
    for name, reverse in (('logo', False), ('logo-reverse', True)):
        if sys.platform == 'darwin' and shutil.which('sips'):
            # Native SVG rasterization, preserving its transparent background.
            subprocess.run(['sips', '-s', 'format', 'png', str(ROOT / f'{name}.svg'),
                            '--out', str(ROOT / f'{name}.png')], check=True, capture_output=True)
        else:
            render(1024, reverse=reverse).save(ROOT / f'{name}.png', optimize=True)
    frames = [render(size, tile=True, optical=size == 16, small=True) for size in (16, 32, 48)]
    for image in frames:
        image.save(ROOT / f'favicon-{image.width}.png', optimize=True)
    write_ico(frames)
    for size, name in ((180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')):
        render(size, opaque=True).save(ROOT / name, optimize=True)
    previews()
    print(f'Built native gorilla icons in {ROOT} ({len(CELLS)} cells, one red accent).')


if __name__ == '__main__':
    main()
