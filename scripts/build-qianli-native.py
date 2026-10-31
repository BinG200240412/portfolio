from pathlib import Path
import fitz,html,json,io,re,shutil
from PIL import Image
R=Path(__file__).resolve().parents[1];A=R/'assets/works/qianli/case';O=A/'native';O.mkdir(exist_ok=True)
import sys
if len(sys.argv)!=2:raise SystemExit('Usage: python scripts/build-qianli-native.py source.pdf')
pdf=fitz.open(sys.argv[1])
def num(x):return f'{x:.2f}'.rstrip('0').rstrip('.')
def color(c):return 'none' if c is None else '#'+''.join(f'{max(0,min(255,round(v*255))):02x}' for v in c)
def pathdata(d):
 out=[];last=None
 for item in d['items']:
  t=item[0]
  if t in ('l','c'):
   p=item[1]
   if last is None or abs(last.x-p.x)+abs(last.y-p.y)>.05:out.append(f'M{num(p.x)} {num(p.y)}')
   if t=='l':q=item[2];out.append(f'L{num(q.x)} {num(q.y)}');last=q
   else:out.append('C'+' '.join(num(z) for p in item[2:] for z in (p.x,p.y)));last=item[-1]
  elif t=='re':
   b=item[1];out.append(f'M{num(b.x0)} {num(b.y0)}h{num(b.width)}v{num(b.height)}h-{num(b.width)}Z');last=None
  elif t=='qu':
   q=item[1];out.append('M'+' L'.join(f'{num(p.x)} {num(p.y)}' for p in (q.ul,q.ur,q.lr,q.ll))+'Z');last=None
 if d.get('closePath'):out.append('Z')
 return ' '.join(out)
def flow_guide(b):
 x,y,w,h=b.x0,b.y0,b.width,b.height
 if y<400 and x<800:return 0,'M694 349H757'
 if y<400 and x<1000:return 1,'M842 349C1100 349 1100 516 1308 516'
 if y<400:return 2,'M1330 349C1215 349 1251 516 1152 516'
 if x>1100 and y<600:return 2,'M1258 516H1152'
 if x>880 and y<600:return 3,'M1022 516C970 516 965 527 898 527'
 if x>600 and y<600:return 4,'M786 524C740 524 725 558 681 558'
 if x<500:return 5,'M541 558C360 558 360 721 529 721'
 if x<800 and h>150:return 7,'M665 723C760 723 765 881 865 881'
 if x<800:return 6,'M665 721C720 721 735 719 794 719'
 if x<1100:return 7,'M930 719L1045 711'
 return 8,'M1181 710L1244 710'
def masked_flow(markup,guide,stage,index,width=180):
 mid=f'q-flow-{index}'
 return f'<defs><mask id="{mid}" maskUnits="userSpaceOnUse" x="375" y="295" width="1170" height="683"><path class="q-flow-reveal" style="--flow-stage:{stage}" d="{guide}" pathLength="1000" fill="none" stroke="white" stroke-width="{width}"/></mask></defs><g class="q-flow-band" mask="url(#{mid})">{markup}</g>'
def vectors(page,box):
 p=pdf[page-1];box=fitz.Rect(box);spans=[s for b in p.get_text('dict')['blocks'] if b['type']==0 for l in b['lines'] for s in l['spans']]
 paths=[]
 for d in p.get_drawings():
  b=d['rect']
  if not box.contains(b) or not b.width or not b.height:continue
  # PDF includes outlined copies of its searchable text; keep native text once.
  if page==13 and d['fill'] is not None:
   if max(d['fill'])<.1:continue
   # Remove the PDF note's neutral paper panel; labels sit on the web page.
   if min(d['fill'])>.8 and max(d['fill'])-min(d['fill'])<.01:continue
  if page==5 and box.y0==325 and (not d['fill'] or d['fill'][1]<.5 or b.width<100):continue
  if any(fitz.Rect(s['bbox'])+(-5,-5,5,5) and (fitz.Rect(s['bbox'])+(-5,-5,5,5)).contains(b) for s in spans):continue
  markup=f'<path d="{pathdata(d)}" fill="{color(d["fill"])}" fill-opacity="{d.get("fill_opacity",1)}" stroke="{color(d["color"])}" stroke-width="{d.get("width") or 0}"/>'
  if page==13 and d.get('fill_opacity')==.25:
   stage,guide=flow_guide(b);markup=masked_flow(markup,guide,stage,len(paths))
  paths.append(markup)
 if page==13:
  guide='M1378.7 515.75C1534 515.75 1534 708.7 1382.5 708.7'
  markup=f'<path id="q-sensor-distribution-link" data-from="touch-sensor" data-to="sensor-distribution" d="{guide}" fill="none" stroke="#5e8c75" stroke-opacity=".25" stroke-width="69"/>'
  paths.append(masked_flow(markup,guide,9,'sensor',74))
 group='q-logic-structure' if page==13 else 'q-reveal-lines'
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{num(box.x0)} {num(box.y0)} {num(box.width)} {num(box.height)}"><g class="{group}">'+''.join(paths)+'</g></svg>'
(O/'contours.svg').write_text(vectors(5,(450,325,1000,485)))
(O/'lighting-contours.svg').write_text(vectors(5,(595,620,1000,787)))
# The CAD bitmap is replaced by the same original vector contours at cutting scale.
s=(O/'contours.svg').read_text();(O/'cut-plan.svg').write_text(s.replace('<g class="q-reveal-lines">','<g class="q-reveal-lines" opacity=".75">'))
# Trace the source's discrete colour regions into independent editable cells.
im=Image.open(io.BytesIO(pdf.extract_image(5857)['image'])).convert('RGB');cells=[]
for row in range(15):
 group=[]
 for col in range(15):
  x=16+col*68.8;y=73+row*40
  rgb=im.getpixel((round(x+34),round(y+20)))
  if min(rgb)>238:continue
  group.append(f'<rect x="{num(x)}" y="{num(y)}" width="68.9" height="40.1" fill="{color(tuple(v/255 for v in rgb))}"/>')
 cells.append(f'<g class="q-native-row" style="--row:{14-row}">'+''.join(group)+'</g>')
(O/'colour-regions.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1067 794">'+''.join(cells)+'</svg>')
# Reuse source vectors as editable DOM, rather than displaying SVG screenshots.
for name in ['tonality-study','tonality-study-en','dots-colour','dots-sensors','dots-touch','dots-delay']:
 shutil.copy(A/(name+'.svg'),O/(name+'.svg'))
# Extract actual source photographs from PDF image objects (never rendered pages).
photos={}
for info in pdf[12].get_image_info(xrefs=True):
 x=info['xref']
 if x in (6397,5871):continue # code screenshot and touch icon are redrawn below
 meta=pdf.extract_image(x);pix=fitz.Pixmap(pdf,x)
 if meta.get('smask'):pix=fitz.Pixmap(pix,fitz.Pixmap(pdf,meta['smask']))
 if pix.colorspace and pix.colorspace.n>3:pix=fitz.Pixmap(fitz.csRGB,pix)
 img=Image.open(io.BytesIO(pix.tobytes('png')));img.thumbnail((1000,1000));f=f'component-{x}.webp';img.save(O/f,'WEBP',quality=88,method=6);photos[x]=f
# Faithful loop geometry, with separate native labels and original photographs.
box=(375,295,1545,978);p=pdf[12];svg=vectors(13,box);svg=svg.replace('</svg>','');parts=[]
for info in p.get_image_info(xrefs=True):
 x=info['xref']
 if x not in photos:continue
 b=fitz.Rect(info['bbox']);clip=fitz.Rect(b)
 if b.y0<450:clip.y0=max(clip.y0,314);clip.y1=min(clip.y1,378)
 elif b.y0<620:clip.y0=max(clip.y0,480);clip.y1=min(clip.y1,559)
 elif b.y0<800:clip.y1=min(clip.y1,743)
 cid=f'q-component-{x}'
 cutout={6407:'arduino-cutout.webp',6401:'sensor-cutout.webp',1587:'led-cutout.webp'}.get(x)
 imagefile=cutout if cutout and (O/cutout).exists() else photos[x]
 if imagefile!=photos[x]:
  if x==1587:clip=fitz.Rect(549,515,673,597)
  b=fitz.Rect(clip)
 parts.append(f'<defs><clipPath id="{cid}"><rect x="{num(clip.x0)}" y="{num(clip.y0)}" width="{num(clip.width)}" height="{num(clip.height)}" rx="8"/></clipPath></defs><image href="../assets/works/qianli/case/native/{imagefile}" x="{num(b.x0)}" y="{num(b.y0)}" width="{num(b.width)}" height="{num(b.height)}" clip-path="url(#{cid})"/>')
# Source code becomes live typography; gesture becomes an SVG line drawing.
parts.append('<g fill="none" stroke="#548775" stroke-width="3"><path d="M790 365v-22q0-8 6-8t6 8v12l3-6q3-5 7 0l2 5q6-8 10 0v20q0 12-13 16h-12l-13-15q-5-7 0-10t9 7"/></g><g fill="#397965" font-family="monospace" font-size="14"><text x="789" y="512">touch → n</text><text x="789" y="529">LED[n]</text><text x="789" y="546">show()</text></g>')
for b in p.get_text('dict')['blocks']:
 if b['type']!=0:continue
 for l in b['lines']:
  for s in l['spans']:
   if not fitz.Rect(box).contains(fitz.Rect(s['bbox'])):continue
   x,y=s['origin'];text=html.escape(s['text']);parts.append(f'<text class="q-native-label" x="{num(x)}" y="{num(y)}" font-size="{num(s["size"])}" fill="#41403d">{text}</text>')
(O/'touch-logic.svg').write_text(svg+''.join(parts)+'</svg>')
# Source metadata records whether an asset is a path, a cell or an original image.
(O/'source.json').write_text(json.dumps({'pdf':'千里江山.pdf','pages':16,'native':{'contours.svg':5,'lighting-contours.svg':5,'cut-plan.svg':'5; source contours replacing the CAD screenshot','colour-regions.svg':'12; individual colour-cell tracing','tonality-study.svg':6,'dots-colour.svg':12,'dots-sensors.svg':12,'dots-touch.svg':12,'dots-delay.svg':12,'touch-logic.svg':'13; source loop paths, editable text, original embedded photographs; redrawn gesture and code'},'photos':photos},ensure_ascii=False,indent=2))
print('Built native assets:',len(list(O.iterdir())))

import xml.etree.ElementTree as E,hashlib
f=O/'dots-touch.svg';root=E.parse(f).getroot();ns='{http://www.w3.org/2000/svg}'
for parent in root.iter():
 for el in list(parent):
  if el.tag==ns+'image':
   parent.remove(el);g=E.SubElement(parent,ns+'g',{'transform':'translate(-10 113)','fill':'none','stroke':'#388e74','stroke-width':'2.8','stroke-linejoin':'round'})
   E.SubElement(g,ns+'path',{'d':'M21 28V8q0-9 7-8t7 8v19q6-8 11-2 7-5 10 3 9-4 11 5v22q-1 16-17 18H35L13 49q-6-8 0-12t14 9'})
E.register_namespace('',ns[1:-1]);f.write_text(E.tostring(root,encoding='unicode'))
f=O/'source.json';data=json.loads(f.read_text());data['webAdaptation']={'circuit':'12 masked growing ribbons; added right-hand sensor-to-zone connection; no decorative dots'};data['pdfSha256']=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest();f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

# The existing mountain silhouette is also transparent when opened in the viewer.
import base64
f=O/'painting-sample.svg'
if f.exists():
 t=f.read_text();t=re.sub(r'href="(?:\.\./assets/works/qianli/case/mountain-sample\.webp|data:image/webp;base64,[^"]*)"',lambda _: 'href="data:image/webp;base64,'+base64.b64encode((A/'mountain-sample.webp').read_bytes()).decode()+'"',t);f.write_text(t)

# SVG source changes get the same deterministic cache discipline as CSS/JS.
f=R/'sections/qianli.html'
t=f.read_text()
for name in ['touch-logic.svg','dots-touch.svg','painting-sample.svg']:
 revision=hashlib.sha256((O/name).read_bytes()).hexdigest()[:10]
 pattern=r'(data-native-src|data-image)="(\.\./assets/works/qianli/case/native/'+re.escape(name)+r')(?:\?v=[^"]*)?"'
 t=re.sub(pattern,lambda m:m[1]+'="'+m[2]+'?v='+revision+'"',t)
f.write_text(t)
