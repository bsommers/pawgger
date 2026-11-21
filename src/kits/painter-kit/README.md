# painter-kit

Painterly (Ghibli-style) vector primitives for Canvas2D. Zero deps, ES module, seeded (no `Math.random`), browser + Node.

```js
import * as kit from './index.js';
const s = kit.makeSurface(256, 256);          // {w,h,canvas,ctx,isShim,clear()}; Node => recording shim (ctx.calls, ctx.count('fill'))
kit.cloud(s.ctx, 128, 80, 160, 60, 5); s.ctx.fillStyle = '#fff'; s.ctx.fill();
```

| Function | Purpose |
|---|---|
| `makeSurface(w,h)` | OffscreenCanvas / DOM canvas / Node shim |
| `blob(ctx,cx,cy,rx,ry,{wobble,points,seed,rot})` | organic closed path |
| `roundRect(ctx,x,y,w,h,r)`, `leaf(ctx,x,y,len,wid,angle)`, `cloud(ctx,cx,cy,w,h,seed)` | path helpers (begin a new path, leave it open: you fill/stroke/clip) |
| `lin(ctx,x0,y0,x1,y1,stops)`, `radial(ctx,x,y,r0,r1,stops,fx,fy)` | gradients; stops are `['#a','#b']` (even) or `[[t,'#a'],..]` |
| `softShadow(ctx,cx,cy,rx,ry,alpha,color)` | radial-falloff ellipse shadow |
| `paperGrain(ctx,w,h,seed,{density,alpha,size,maxSpecks})` | seeded paper specks |
| `washFill(ctx,pathFn,color,{edge,edgeWidth,bloom,bounds})` | watercolour fill: darker pooled edge + light bloom |
| `brush(ctx,pts,{color,w0,w1,alpha,jitter,seed})` | tapering round-capped stroke |
| `sway(t,phase,amp,speed)` | smooth pure-function wobble |
| `rng(seed)`, `rgba`, `mix`, `lighten`, `darken`, `parseColor` | helpers |
| `drawCloud/drawGrassTuft/drawCatBlob/drawLog` | sample sprites / style reference |

Shim: `makeRecordingCtx(canvas)` records every call as `{op,args,alpha,fill,stroke}` in `ctx.calls`; gradients are plain objects with `.stops`. Preview: `node tools/shot.mjs --url /src/kits/painter-kit/example.html --out out/previews/painter-kit.png`.
