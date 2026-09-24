# Herramientas de recorte: por componentes (hoja de objetos) y por rejilla registrada (hoja de animación).
import json, subprocess, numpy as np
from collections import deque
def load(p):
    w,h=[int(v) for v in subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height","-of","csv=p=0",p],capture_output=True,text=True).stdout.strip().split(",")]
    raw=subprocess.run(["ffmpeg","-v","error","-i",p,"-f","rawvideo","-pix_fmt","rgba","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.uint8).reshape(h,w,4)
def save(a,p):
    h,w=a.shape[:2]; subprocess.run(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgba","-s",f"{w}x{h}","-i","-",p],input=np.ascontiguousarray(a).tobytes())
def comps(mask,conn=1):
    H,W=mask.shape; lab=np.zeros((H,W),int); out=[]; n=0
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not lab[y,x]:
                n+=1; q=deque([(y,x)]); lab[y,x]=n; ys=[];xs=[]
                while q:
                    cy,cx=q.popleft(); ys.append(cy); xs.append(cx)
                    for dy in range(-conn,conn+1):
                        for dx in range(-conn,conn+1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not lab[ny,nx]: lab[ny,nx]=n; q.append((ny,nx))
                out.append((n,min(xs),min(ys),max(xs)+1,max(ys)+1,len(xs)))
    return lab,out
def atlas_boxes(img,names,rows,s=8,pad=4,min_cells=30):
    a=img[:,:,3]>20; H,W=a.shape
    g=a[:H//s*s,:W//s*s].reshape(H//s,s,W//s,s).any(axis=(1,3))
    _,bs=comps(g,2); bs=[b for b in bs if b[5]>min_cells]
    rh=H/rows; bs.sort(key=lambda b:(int(((b[2]+b[4])/2*s)//rh),(b[1]+b[3])/2))
    fr={}
    for nm,b in zip(names,bs):
        x0,y0,x1,y1=b[1]*s-pad,b[2]*s-pad,b[3]*s+pad,b[4]*s+pad
        fr[nm]={"x":max(0,x0),"y":max(0,y0),"w":min(W,x1)-max(0,x0),"h":min(H,y1)-max(0,y0)}
    return fr,len(bs)
def anim_rows(img,cols,rows,names,outdir,anchor):
    H,W=img.shape[:2]; cw,ch=W//cols,H//rows
    for r,nm in enumerate(names):
        cells=[img[r*ch:(r+1)*ch,c*cw:(c+1)*cw].copy() for c in range(cols)]
        for c in cells:  # quedarse con la pieza principal y lo cercano
            m=c[:,:,3]>10; lab,cs=comps(m,1)
            if not cs: continue
            big=max(cs,key=lambda b:b[5]); keep=np.zeros(m.shape,bool)
            for b in cs:
                if b[0]==big[0] or (b[1]>=big[1]-30 and b[3]<=big[3]+30 and b[2]>=big[2]-40 and b[4]<=big[4]+10): keep|=lab==b[0]
            c[~keep]=0
        pts=[]
        for c in cells:
            ys,xs=np.nonzero(c[:,:,3]>40)
            if anchor[r]=="bottom": y=ys.max(); x=xs[ys>y-12].mean()
            else: y=ys.min(); x=xs[ys<y+12].mean()
            pts.append((x,y))
        # registro: la base de todos los cuadros al promedio (el crecimiento cambia la altura, no la base)
        rx=np.median([p[0] for p in pts]); ry=np.median([p[1] for p in pts])
        for i,(c,(x,y)) in enumerate(zip(cells,pts)):
            dx,dy=int(round(rx-x)),int(round(ry-y)); o=np.zeros_like(c)
            ys0,ys1=max(0,dy),min(ch,ch+dy); xs0,xs1=max(0,dx),min(cw,cw+dx)
            o[ys0:ys1,xs0:xs1]=c[ys0-dy:ys1-dy,xs0-dx:xs1-dx]
            save(o,f"{outdir}/{nm}_{i}.png")
