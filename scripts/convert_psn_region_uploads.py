#!/usr/bin/env python3
"""Convert the 6 merchant-provided PSN region images (PNGs misnamed .webp)
into real 1200x1200 WebP (q82) under the 600KB media cap."""
from PIL import Image
import os

SRC = '/home/z/my-project/upload/'
OUT = '/home/z/my-project/izoko-repo/scripts/converted_region_uploads/'
os.makedirs(OUT, exist_ok=True)

FILES = [
    'playstation-network-gift-card-uk-psn-digital-code.webp',
    'playstation-network-gift-card-canada-psn-digital-code.webp',
    'playstation-network-gift-card-japan-psn-digital-code.webp',
    'playstation-network-gift-card-Australia-psn-digital-code.webp',
    'playstation-network-gift-card-singapore-psn-digital-code.webp',
    'playstation-network-gift-card-malayasia-psn-digital-code.webp',
]

for name in FILES:
    src = SRC + name
    im = Image.open(src)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        # composite onto white so transparency does not turn black
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im)
    im = im.convert('RGB')
    # fit inside 1200x1200, preserve aspect
    im.thumbnail((1200, 1200), Image.LANCZOS)
    canvas = Image.new('RGB', (1200, 1200), (255, 255, 255))
    canvas.paste(im, ((1200 - im.width) // 2, (1200 - im.height) // 2))
    base = name.rsplit('.', 1)[0]
    dst = OUT + base + '.webp'
    q = 82
    canvas.save(dst, 'WEBP', quality=q, method=6)
    while os.path.getsize(dst) > 600 * 1024 and q > 55:
        q -= 6
        canvas.save(dst, 'WEBP', quality=q, method=6)
    head = open(dst, 'rb').read(12)
    ok = head[:4] == b'RIFF' and head[8:12] == b'WEBP'
    print(f'{base}.webp ok={ok} q={q} bytes={os.path.getsize(dst)} dims={canvas.size}')
