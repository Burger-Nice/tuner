# Builds index.html from the brand assets: python3 build.py
import re, pathlib
A = pathlib.Path('../../brand-v5/v5.4/assets')
mark = (A/'mark.svg').read_text(); lock = (A/'lockup.svg').read_text()
paths = re.findall(r'<path d="([^"]+)" fill="([^"]+)"/>', mark)           # band1, band2, band3, wedge
VB_M = '-36 -41 104 82'
def msvg(d, fill, cls):
    return f'<svg class="{cls}" viewBox="{VB_M}" aria-hidden="true"><defs><linearGradient id="mkg{cls}" x1="0" y1="-35" x2="62" y2="35" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F95BAC"/><stop offset="1" stop-color="#D540F5"/></linearGradient></defs><path d="{d}" fill="{fill.replace("url(#mkg)", f"url(#mkg{cls})")}"/></svg>'
marks = ''.join(msvg(d, f, c) for (d, f), c in zip(paths, ['l-b1', 'l-b2', 'l-b3', 'l-wd']))
i = lock.index('<g transform="translate(151.4 0)">'); w = lock[i:]
groups = re.findall(r'<g transform="translate\(([-\d.]+) 0\)">(.*?)</g>', w, flags=re.S)
defs = re.search(r'<linearGradient id="lkwwg".*?</linearGradient>', lock, flags=re.S).group(0)
VB_L = '-6 -108.83 636.08 145.71'
letters = ''
for k, (t, cap) in enumerate(groups):
    inner = f'<g transform="translate(151.4 0)">{cap}</g></g>' if k == 0 else f'<g transform="translate(151.4 0)"><g transform="translate({t} 0)">{cap}</g></g>'
    letters += f'<svg class="l-lt l-c{k}" viewBox="{VB_L}" aria-hidden="true"><defs>{defs}</defs>{inner}</svg>'
html = (pathlib.Path('template.html').read_text()
        .replace('<!--MARKS-->', marks).replace('<!--LETTERS-->', letters))
pathlib.Path('index.html').write_text(html); print('wrote index.html', len(html))
