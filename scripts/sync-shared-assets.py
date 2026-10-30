#!/usr/bin/env python3
"""Use one content version for each local JS/CSS resource across portfolio pages."""
from pathlib import Path
import hashlib,re,subprocess,sys
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(ROOT/'scripts/build-home-matrix.py')], check=True)
subprocess.run([sys.executable, str(ROOT/'scripts/build-xr-place.py')], check=True)
cache={}
def version(path):
 if path not in cache:
  target=ROOT/path
  data=target.read_bytes() if target.is_file() else subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT)
  cache[path]=hashlib.sha256(data).hexdigest()[:10]
 return cache[path]
changed=0
for page in [*ROOT.glob('*.html'),*(ROOT/'sections').glob('*.html')]:
 source=page.read_text()
 def replace(match):
  prefix,url,quote=match.groups();parts=urlsplit(url)
  if parts.scheme or parts.netloc or not parts.path.endswith(('.css','.js')):return match[0]
  target=(page.parent/parts.path).resolve()
  try:rel=target.relative_to(ROOT).as_posix()
  except ValueError:return match[0]
  if not rel.startswith('assets/'):return match[0]
  digest=version(rel)
  if re.search(r'(?:\?|&)v=',url):url=re.sub(r'([?&])v=[^&#]+',lambda m:m[1]+'v='+digest,url)
  else:url+=('&' if '?' in url else '?')+'v='+digest
  return prefix+url+quote
 updated=re.sub(r'((?:src|href)=[\"\'])([^\"\']+)([\"\'])',replace,source)
 if updated!=source:page.write_text(updated);changed+=1
print(f'{changed} pages updated; {len(cache)} JS/CSS assets share stable content versions')
