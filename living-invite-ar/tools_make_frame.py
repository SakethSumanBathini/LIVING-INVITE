#!/usr/bin/env python3
"""
make a Living-Invite frame from any artwork.

USAGE:
  python3 tools_make_frame.py INPUT.jpg OUTPUT_NAME --mode cutout
  python3 tools_make_frame.py INPUT.jpg OUTPUT_NAME --mode backdrop

modes:
  cutout   -> removes near-white background + center (for ornate frames photographed
              on white). Result: only the frame art is opaque; room shows around & through.
  backdrop -> keeps the full artwork opaque (decorated card) and cuts a center window
              so the photo/video shows through. Room shows only around the card edges.

output: assets/frame-OUTPUT_NAME.png  (880x1120, transparent window 800x1040 centred)
then set  "frame": "OUTPUT_NAME"  in a card's config.json  (or test with ?frame=OUTPUT_NAME)
"""
import sys, os, argparse
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

W,H=880,1120

def fit_height_pad(im):
    r=im.width/im.height; nh=H; nw=int(H*r)
    im=im.resize((nw,nh),Image.LANCZOS)
    c=Image.new("RGBA",(W,H),(0,0,0,0)); c.alpha_composite(im,((W-nw)//2,(H-nh)//2)); return c

def fit_cover(im):
    r=im.width/im.height; tr=W/H
    if r>tr: nh=H; nw=int(H*r)
    else: nw=W; nh=int(W/r)
    im=im.resize((nw,nh),Image.LANCZOS); x=(nw-W)//2; y=(nh-H)//2
    return im.crop((x,y,x+W,y+H))

def cutout(im):
    im=im.convert("RGBA"); px=im.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            r,g,b,a=px[x,y]; mx,mn=max(r,g,b),min(r,g,b)
            if mn>=205 and (mx-mn)<=38: px[x,y]=(r,g,b,0)
    return fit_height_pad(im)

def backdrop(im, win_w=560, win_h=820, nudge_y=20, ogee=True):
    out=fit_cover(im.convert("RGBA"))
    win=Image.new("L",(W,H),0); d=ImageDraw.Draw(win)
    x0=(W-win_w)//2; y0=(H-win_h)//2+nudge_y
    d.rounded_rectangle([x0,y0,x0+win_w,y0+win_h],radius=90,fill=255)
    if ogee: d.polygon([(x0+40,y0+win_h-40),(x0+win_w-40,y0+win_h-40),(W//2,y0+win_h+70)],fill=255)
    win=win.filter(ImageFilter.GaussianBlur(1))
    r,g,b,a=out.split(); aa=np.array(a); aa[np.array(win)>128]=0
    return Image.merge("RGBA",(r,g,b,Image.fromarray(aa)))

def compress(im, name, colors=255):
    p=f"assets/frame-{name}.png"; r,g,b,a=im.split()
    q=Image.merge("RGB",(r,g,b)).quantize(colors=colors,method=Image.FASTOCTREE,dither=Image.NONE)
    arr=np.array(q); arr[np.array(a)<128]=colors
    q2=Image.fromarray(arr,mode="P"); q2.putpalette(q.getpalette()[:colors*3]+[0,0,0])
    q2.info["transparency"]=colors; q2.save(p,optimize=True,transparency=colors)
    return os.path.getsize(p)//1024

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("input"); ap.add_argument("name")
    ap.add_argument("--mode",choices=["cutout","backdrop"],default="cutout")
    ap.add_argument("--win_w",type=int,default=560); ap.add_argument("--win_h",type=int,default=820)
    a=ap.parse_args()
    im=Image.open(a.input)
    out = cutout(im) if a.mode=="cutout" else backdrop(im,a.win_w,a.win_h)
    kb=compress(out,a.name)
    # verify
    chk=Image.open(f"assets/frame-{a.name}.png").convert("RGBA").split()[3]
    print(f"saved assets/frame-{a.name}.png  {W}x{H}  {kb}KB  center_alpha={chk.getpixel((W//2,H//2))}")
    print(f'now set  "frame": "{a.name}"  in config.json  (or test ?frame={a.name})')
