"""Author the GouGO sample scene and continuous controller drawings as editable SVG.

Coordinates follow the supplied 1660 × 990 room and 472 × 317 controller samples.
Every plane, limb, curve, label and leader is authored here; no bitmap tracing.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / 'assets/works/xr/experience'


def path(d, cls='', **attrs):
    values = {'d': d, 'class': cls, **attrs}
    return '<path ' + ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in values.items() if v != '') + '/>'


def group(body, cls, at=0, **attrs):
    values = {'class': cls, 'style': f'--at:{at}s', **attrs}
    return '<g ' + ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in values.items()) + '>' + body + '</g>'


def svg(body, w, h, label):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">\n{body}\n</svg>\n'


defs = '''<defs>
<linearGradient id="scene-screen" x2="1" y2="1"><stop stop-color="#34694b"/><stop offset=".6" stop-color="#397453"/><stop offset="1" stop-color="#2d6547"/></linearGradient>
<linearGradient id="scene-floor" x2=".8" y2="1"><stop stop-color="#b9b9aa"/><stop offset="1" stop-color="#aaa99b"/></linearGradient>
<linearGradient id="scene-glass" x2="1" y2="1"><stop stop-color="#e7e6d8" stop-opacity=".67"/><stop offset="1" stop-color="#e7e6d8" stop-opacity=".84"/></linearGradient>
<radialGradient id="scene-glow"><stop stop-color="#a2edbd" stop-opacity=".38"/><stop offset="1" stop-color="#a2edbd" stop-opacity="0"/></radialGradient>
</defs>'''

screen = path('M678 164C1031 163 1338 230 1338 475V728C1169 546 1047 481 678 482Z', fill='url(#scene-screen)')
floor = path('M387 718 758 495 1196 711 802 955Z', fill='url(#scene-floor)')
back = path('M387 540 758 334V495L387 718Z', fill='#b9b8a7', fill_opacity='.78') + path('M678 381 758 334V482H678Z', fill='#d1ddc7', fill_opacity='.35')
front = path('M387 540 802 782V955L387 718Z', fill='url(#scene-glass)', stroke='#eeeede', stroke_width='.8')
side = path('M802 782 1196 542V711L802 955Z', fill='url(#scene-glass)', stroke='#eeeede', stroke_width='.8')

panels = ''
for d, matrix, at in [
    ('M531 506 640 446V515L531 573Z', '.87 -.5 0 1 539 543', 1.05),
    ('M497 652 693 766V853L497 741Z', '.87 .5 0 1 539 736', 1.2),
    ('M955 740 1066 673V744L955 808Z', '.87 -.5 0 1 964 778', 1.35),
]:
    pane = path(d, fill='#f1f2ee', fill_opacity='.28', stroke='#fff', stroke_width='1')
    pane += f'<text class="gis-art-type" transform="matrix({matrix})" fill="#fafbf6" font-size="21">INTERFACE</text>'
    panels += group(pane, 'gis-part gis-panel', at)

sofa = '<ellipse cx="857" cy="614" rx="96" ry="48" transform="rotate(-2 857 614)" fill="#f3f2e9" fill-opacity=".14" stroke="#fff" stroke-width="1.1"/>'
for d, colour in [
    ('M789 582 828 561 905 607 866 630Z', '#f3f1e8'), ('M789 582 866 630V657L789 612Z', '#e2dfd5'),
    ('M866 630 905 607V636L866 657Z', '#f4f2e9'), ('M804 589 830 575 887 609 863 623Z', '#d9d6cd'),
    ('M800 577 813 570 888 614 875 621Z', '#faf9f1'), ('M800 577 875 621V632L800 589Z', '#eae7df'),
    ('M875 621 888 614V625L875 632Z', '#c9c6bd'), ('M853 568 874 556 898 570 883 582Z', '#fffdf6'),
    ('M853 568 883 582V604L853 587Z', '#e7e4db'), ('M883 582 898 570V592L883 604Z', '#f3f1e8'),
]:
    sofa += path(d, fill=colour)

person = '<ellipse cx="906" cy="604" rx="11" ry="4" fill="#777a74" fill-opacity=".35"/>'
for d, colour in [
    ('M895 547 903 546 904 572 899 601 906 604 906 610 897 609 895 602 895 575Z', '#6d7779'),
    ('M904 546 912 549 909 577 906 600 914 602 914 606 904 607 901 600 902 575Z', '#939b9a'),
    ('M897 512Q903 508 909 514L913 519 915 547 908 555 896 550 894 527Z', '#91a9ce'),
    ('M895 521Q890 521 889 530L887 546 890 558 894 555 894 544 899 529Z', '#8fa7c9'),
    ('M910 519Q915 520 916 527L918 544 920 555 916 561 913 555 913 545 908 532Z', '#aac0dd'),
    ('M902 504 910 503 909 515 901 516Z', '#c4c8bf'),
    ('M900 501Q906 493 914 499L918 506 912 510 901 510Z', '#7f8b8d'),
    ('M903 499 910 499 913 505 906 509 900 507Z', '#e1e3dc'),
    ('M911 500 916 503 918 508 911 511 908 506Z', '#323d40'),
]:
    person += path(d, fill=colour)

# The low-poly dog is a small authored mesh, with connected facet outlines.
dog_planes = [
    'M989 481 1028 464 1048 473 1009 493Z', 'M1009 493 1048 473 1060 490 1059 513 1031 531 1009 518Z',
    'M989 481 1009 493 1009 518 979 527 961 510 960 487Z',
    'M1009 518 1031 531 1017 544 989 537 979 527Z',
    'M953 459 966 447 981 451 993 462 989 481 972 489 951 479Z',
    'M951 479 972 489 960 501 940 490 939 481Z', 'M966 447 969 468 953 481 940 481 953 459Z',
    'M981 451 982 471 972 489 969 468Z',
    'M1034 513 1047 507 1045 527 1058 532 1064 548 1057 556 1049 544 1035 536Z',
    'M1058 532 1068 528 1074 548 1068 557 1057 556 1064 548Z',
    'M975 519 987 524 978 544 973 560 960 576 952 573 955 565 964 553 966 537Z',
    'M975 519 977 539 972 558 960 570 955 565 964 553 966 537Z',
    'M1002 516 1016 510 1018 536 1012 555 1008 581 996 594 988 591 993 580 1000 571 1003 548Z',
    'M1009 520 1016 510 1018 536 1012 555 1008 581 996 594 1000 583 1006 573 1007 548Z',
    'M1022 500 1034 498 1035 520 1030 534 1024 539 1019 534 1024 518Z',
]
dog = '<ellipse cx="1005" cy="514" rx="100" ry="104" fill="url(#scene-glow)"/>'
dog += '<g fill="#b5dbc7" fill-opacity=".62" stroke="#edfff2" stroke-opacity=".8" stroke-width=".85" stroke-linejoin="round">'
dog += ''.join(path(d) for d in dog_planes) + '</g>'
dog += '<g fill="none" stroke="#edfff2" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">'
for d in [
    'M989 481 982 504 1009 518 1009 493 1028 487 1048 473',
    'M982 504 979 527M1028 487 1035 504 1031 531M1035 504 1060 490',
    'M951 459 969 468 982 471M951 479 960 487 972 489',
    'M966 537 977 539M964 553 973 560M955 565 960 570',
    'M1003 548 1012 551M1000 571 1008 576M993 580 1001 585',
    'M1045 527 1058 532M1057 542 1064 538M1064 548 1072 546',
    'M1045 473Q1057 462 1059 438L1055 437Q1052 459 1040 468',
]:
    dog += path(d, 'gis-mesh-line', pathLength='1')
dog += '</g>'

callouts = ''
for d, x, y, text, at in [
    ('M978 288V154H1145', 1171, 170, 'Realistically morphed live<tspan x="1171" dy="44">video feed of sports game</tspan>', 1.85),
    ('M657 625H290V774', 292, 818, 'Interactive 3D<tspan x="292" dy="44">environment</tspan>', 2.05),
    ('M944 545H1088V843', 1087, 890, 'Virtual reality user', 2.25),
]:
    callouts += path(d, 'gis-leader', fill='none', stroke='var(--gi-label,#858b88)', stroke_width='2.5', pathLength='1', style=f'--at:{at}s')
    anchor = ' text-anchor="middle"' if x == 292 else ''
    callouts += f'<text class="gis-label gis-art-type" x="{x}" y="{y}"{anchor} fill="var(--gi-label,#858b88)" font-size="36" style="--at:{at+.9}s">{text}</text>'
for x, y, at in [(978, 288, 1.8), (657, 625, 2), (944, 545, 2.2)]:
    callouts += f'<g class="gis-part gis-target" style="--at:{at}s" fill="none" stroke="var(--gi-label,#858b88)" stroke-width="2"><circle cx="{x}" cy="{y}" r="14"/><circle cx="{x}" cy="{y}" r="7"/></g>'

scene = defs
scene += group(screen, 'gis-part gis-screen', .2, data_component='curved-screen')
scene += group(floor, 'gis-part gis-floor', 0, data_component='floor')
scene += group(back, 'gis-part gis-wall', .38, data_component='rear-wall')
scene += group(front, 'gis-part gis-wall', .55, data_component='front-wall')
scene += group(side, 'gis-part gis-wall', .72, data_component='side-wall')
scene += panels + group(sofa, 'gis-part gis-furniture', 1, data_component='sofa')
scene += group(person, 'gis-part gis-person', 1.2, data_component='visitor')
scene += group(dog, 'gis-part gis-dog', 1.4, data_component='wireframe-dog')
scene += group('<text class="gis-art-type" transform="matrix(.98 .22 0 1 975 394)" fill="#f5faf2" font-size="54" font-weight="700">LIVE</text>', 'gis-part gis-live', 1.05)
scene += callouts
(OUT / 'interaction-scene.svg').write_text(svg(scene, 1660, 990, '虚实交互空间'))


def stroke(d, at=0, width=1.6, cls=''):
    return path(d, 'gic-stroke ' + cls, fill='none', stroke='currentColor', stroke_width=width,
                stroke_linecap='round', stroke_linejoin='round', pathLength='1', style=f'--at:{at}s')


def circle(x, y, r, at=.2, width=1.4):
    return f'<circle class="gic-stroke" cx="{x}" cy="{y}" r="{r}" fill="none" stroke="currentColor" stroke-width="{width}" pathLength="1" style="--at:{at}s"/>'


def robot(x, y, w, h, pose='stand', at=.3):
    contours = [
        'M43 26 125 20 144 35 60 42 43 26 41 51 60 65 142 57 144 35M60 42V65M125 20V43L142 57',
        'M43 27 23 28 13 42 27 55 41 51M23 28 37 41 27 55M13 42 29 42 37 41 43 27',
        'M60 49 128 42M80 40V61M111 37V60',
        'M45 52 34 80 40 104 46 106 41 80 52 57',
        'M117 44 105 71 110 95 116 96 112 71 123 47',
        'M65 64 58 93 65 118 72 118 65 92 72 64',
        'M133 57 122 80 128 106 135 106 129 80 140 56',
    ]
    if pose == 'bow':
        contours[5] = 'M65 64 40 84 57 106 64 106 49 84 72 64'
        contours[6] = 'M133 57 144 80 128 106 135 110 151 80 140 56'
    if pose == 'walk':
        contours[5] = 'M65 64 48 87 72 115 79 114 56 86 72 64'
        contours[6] = 'M133 57 117 80 107 106 114 108 124 82 140 56'
    body = ''.join(stroke(d, at+i*.06, 1.6) for i, d in enumerate(contours))
    return f'<g data-component="robot-dog" transform="translate({x} {y}) scale({w/160:.4f} {h/124:.4f})">{body}</g>'


# The outer wrist, palm and thumb are a single continuous cubic path.
hand = 'M1 316C25 293 57 268 72 236C76 224 81 214 90 207L104 183C109 176 115 172 120 176C130 183 125 196 119 207L113 222C112 230 116 235 124 235C131 235 139 229 144 233C153 242 147 253 139 257C151 256 155 266 147 275C144 280 136 283 130 283C138 285 138 294 132 300C126 306 118 304 111 302C106 306 104 311 103 317'
hand_details = [
    'M116 240C128 236 135 236 139 242C143 248 134 252 127 252C116 251 113 244 116 240',
    'M112 259C117 252 127 251 132 254C140 259 139 264 134 269C128 273 119 273 115 269',
    'M110 281C112 275 120 273 127 276C136 279 134 289 128 293C121 297 115 294 112 289',
    'M104 222C97 242 97 265 103 279', 'M99 191C105 190 117 192 122 197',
]
controller = [
    'M88 157C74 143 92 129 115 132C143 134 165 144 179 157C198 181 170 195 149 192C125 189 102 180 88 164C86 161 86 159 88 157Z',
    'M88 151C118 148 159 161 182 177', 'M98 139C126 132 166 149 178 163',
    'M136 193C127 206 116 221 112 238M160 190C170 193 165 207 157 214L146 232',
    'M114 301C124 297 129 289 132 279M142 254L148 234',
]


def held_controller():
    result = group(''.join(stroke(d, .05+i*.06, 1.5) for i, d in enumerate(controller)), 'gic-controller', data_component='controller')
    result += group(stroke(hand, .2, 1.9) + ''.join(stroke(d, .45+i*.06, 1.3) for i, d in enumerate(hand_details)), 'gic-hand', data_component='hand')
    result += circle(148, 182, 4, .7) + circle(138, 197, 4, .75)
    return result


def pad(buttons=False):
    result = ''.join(circle(349, 158, r, .45+i*.05) for i, r in enumerate([79, 74, 66, 40, 32, 25]))
    if buttons:
        for x, y, char in [(309, 116, 'X'), (389, 116, 'Y'), (309, 203, 'A'), (389, 203, 'B')]:
            result += circle(x, y, 8, .7)
            result += f'<text class="gic-letter" x="{x}" y="{y+4}" text-anchor="middle" fill="currentColor" font-size="11" style="--at:1.05s">{char}</text>'
    else:
        for d in ['M349 97 343 108H355Z', 'M410 158 399 152V164Z', 'M349 219 343 208H355Z', 'M288 158 299 152V164Z']:
            result += stroke(d, .8, 1.5)
    return group(result, 'gic-pad', data_component='control-pad')


start = held_controller() + robot(203, 22, 90, 82, at=.6)
start += group(stroke('M445 317C428 296 412 280 405 260C401 249 395 239 385 235C381 220 371 216 361 221C358 208 347 204 339 211C333 201 324 198 316 203L300 170C295 160 287 155 284 160C279 164 286 181 290 190L312 237C306 235 301 239 299 247C294 258 296 272 302 283C308 294 307 306 304 317', .3, 1.9) + ''.join(stroke(d, .6+i*.08, 1.3) for i, d in enumerate([
    'M316 203C322 214 327 225 335 231', 'M339 211C345 223 348 232 355 235',
    'M361 221C365 230 367 236 373 239', 'M304 248C313 247 319 254 321 266',
])), 'gic-pointing-hand', data_component='pointing-hand')
position = held_controller() + robot(75, 22, 132, 96, 'walk', .45) + pad()
position += stroke('M59 61H29L43 48M29 61 43 74M214 61H244L230 48M244 61 230 74', .9, 1.8, 'gic-direction')
position += stroke('M123 177H79L88 172M79 177 88 182', .95, 1.7, 'gic-direction')
pose = held_controller() + robot(11, 27, 91, 73, at=.4) + robot(112, 48, 92, 54, 'bow', .55) + robot(207, 20, 91, 80, at=.7) + pad(True)
pose += stroke('M89 135 68 108 75 111M68 108 68 116M149 127V106L145 113M149 106 153 113M192 150 227 111 219 114M227 111 224 120M186 198H265L257 194M265 198 257 202', 1.0, 1.6, 'gic-direction')

for name, body in [('start', start), ('position', position), ('pose', pose)]:
    (OUT / f'controller-{name}-lines.svg').write_text(svg(body, 472, 317, '连续线条手柄示意').replace('role="img"', 'role="img" color="#858b88"'))

print('Built one component scene and three continuous-line controller diagrams.')
