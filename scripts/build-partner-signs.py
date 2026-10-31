from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import html
ROOT=Path(__file__).resolve().parents[1]
FONT='/System/Library/Fonts/STHeiti Medium.ttc'
OUT=ROOT/'assets/partners'
OUT.mkdir(parents=True,exist_ok=True)
LABELS={
 'tea-zh':('网易雷火 · 校企合作项目',[('网易雷火 · 校企合作项目',15)],'#3f6658','#8daf9a'),
 'tea-en':('NetEase ThunderFire · University–industry project',[('NETEASE THUNDERFIRE',12),('UNIVERSITY–INDUSTRY PROJECT',10)],'#3f6658','#8daf9a'),
 'gogo-zh':('云深处 × Rokid · 校企合作项目',[('云深处 × Rokid · 校企合作项目',15)],'#77603f','#bca16e'),
 'gogo-en':('DEEP Robotics × Rokid · University–industry project',[('DEEP ROBOTICS × ROKID',12),('UNIVERSITY–INDUSTRY PROJECT',10)],'#77603f','#bca16e'),
}
for key,(label,lines,bg,edge) in LABELS.items():
 strips=[]
 for text,size in lines:
  font=ImageFont.truetype(FONT,size)
  box=font.getbbox(text)
  im=Image.new('L',(box[2]-box[0],box[3]-box[1]),0)
  ImageDraw.Draw(im).text((-box[0],-box[1]),text,font=font,fill=255)
  strips.append(im)
 gap=3
 tw=max(im.width for im in strips);th=sum(im.height for im in strips)+gap*(len(strips)-1)
 pitch=1.5
 width=round(tw*pitch+34);height=round(max(44,th*pitch+16))
 shift=(height-th*pitch)/2
 circles=[]
 for im in strips:
  left=(width-im.width*pitch)/2
  for y in range(im.height):
   for x in range(im.width):
    if im.getpixel((x,y))>=92:
     circles.append(f'<circle cx="{left+x*pitch+.75:.2f}" cy="{shift+y*pitch+.75:.2f}" r=".53"/>')
  shift+=(im.height+gap)*pitch
 # Small pixel steps belong to the panel; all lit lettering is real circles.
 panel=f'M6 0H{width-6}V3H{width-3}V6H{width}V{height-6}H{width-3}V{height-3}H{width-6}V{height}H6V{height-3}H3V{height-6}H0V6H3V3H6Z'
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(label)}"><title>{html.escape(label)}</title><path d="{panel}" fill="{bg}"/><path d="M9 3H{width-9}M9 {height-3}H{width-9}" fill="none" stroke="{edge}" stroke-opacity=".42" stroke-dasharray="1 4" stroke-linecap="round"/><g fill="#f2eddc">'+''.join(circles)+'</g></svg>\n'
 (OUT/f'{key}.svg').write_text(svg)
 print(key, width,height,len(circles),len(svg))
