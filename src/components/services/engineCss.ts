// AUTO-GENERATED from the owner's "Services — PlayBeat Digital v2" artifact.
// Scoped under .pbsv-root; keyframes renamed (pbsv-*) to avoid collisions.
export const ENGINE_CSS = String.raw`@property --c1{syntax:'<color>';inherits:true;initial-value:#3B82F6}
@property --c2{syntax:'<color>';inherits:true;initial-value:#22D3EE}
.pbsv-root{
  --navy:#050816;--mid:#081426;--char:#111827;--white:#F8FAFC;--surf:#F4F7FB;
  --blue:#3B82F6;--cyan:#22D3EE;--purple:#7C3AED;--violet:#A855F7;--indigo:#4F46E5;
  --orange:#FF7A18;--amber:#FBBF24;--pink:#EC4899;--emerald:#10B981;
  --g-primary:linear-gradient(110deg,#3B82F6,#A855F7 52%,#22D3EE);
  --g-energy:linear-gradient(110deg,#FF7A18,#EC4899 55%,#7C3AED);
  --g-cta:linear-gradient(110deg,#3B82F6,#7C3AED);
  --ease:cubic-bezier(.22,.8,.26,1);
  --r:22px;
  
  --bg:#F4F7FB;--bg2:#fff;--tx:#0B1220;--mu:#526079;--ln:rgba(8,20,38,.10);
  --card:#fff;--card2:#F4F7FB;--blur:none;
  --sh:0 1px 2px rgba(8,20,38,.05),0 18px 40px -22px rgba(8,20,38,.22);
  --blob:.5;--gridc:rgba(8,20,38,.05);
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
}
@media (prefers-color-scheme:dark){
  .pbsv-root:not([data-theme="light"]){
  --bg:#050816;--bg2:#081426;--tx:#F8FAFC;--mu:#9AA7C2;--ln:rgba(255,255,255,.10);
  --card:rgba(255,255,255,.05);--card2:rgba(255,255,255,.04);--blur:blur(20px);
  --sh:0 30px 60px -30px rgba(0,0,0,.75);--blob:1;--gridc:rgba(255,255,255,.045);
}
}
.pbsv-root[data-theme="dark"], .pbsv-root .ink, .pbsv-root .grad{
  --bg:#050816;--bg2:#081426;--tx:#F8FAFC;--mu:#9AA7C2;--ln:rgba(255,255,255,.10);
  --card:rgba(255,255,255,.05);--card2:rgba(255,255,255,.04);--blur:blur(20px);
  --sh:0 30px 60px -30px rgba(0,0,0,.75);--blob:1;--gridc:rgba(255,255,255,.045);
}
.pbsv-root .grad{--mu:#C9D2F0;--card:rgba(255,255,255,.08);--ln:rgba(255,255,255,.16)}
.pbsv-root .paper{
  --bg:#F8FAFC;--bg2:#fff;--tx:#0B1220;--mu:#526079;--ln:rgba(8,20,38,.10);
  --card:#fff;--card2:#F4F7FB;--blur:none;
  --sh:0 1px 2px rgba(8,20,38,.05),0 18px 40px -22px rgba(8,20,38,.22);
}
.pbsv-root *, .pbsv-root *::before, .pbsv-root *::after{box-sizing:border-box}
.pbsv-root{scroll-behavior:smooth;scroll-padding-top:calc(96px + env(safe-area-inset-top,0px));-webkit-text-size-adjust:100%}
.pbsv-root{margin:0;background:var(--bg);color:var(--tx);font:400 16px/1.6 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.pbsv-root::before{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;opacity:var(--blob);
  background:
   radial-gradient(42% 38% at 8% 4%,rgba(34,211,238,.20),transparent 70%),
   radial-gradient(46% 42% at 55% 46%,rgba(124,58,237,.18),transparent 70%),
   radial-gradient(40% 40% at 96% 96%,rgba(255,122,24,.16),transparent 70%)}
.pbsv-root::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:linear-gradient(var(--gridc) 1px,transparent 1px) 0 0/56px 56px,linear-gradient(90deg,var(--gridc) 1px,transparent 1px) 0 0/56px 56px;
  -webkit-mask:radial-gradient(80% 70% at 50% 30%,#000,transparent);mask:radial-gradient(80% 70% at 50% 30%,#000,transparent)}
.pbsv-root a{color:inherit;text-decoration:none}
.pbsv-root button, .pbsv-root input, .pbsv-root select, .pbsv-root textarea{font:inherit;color:inherit}
.pbsv-root button{cursor:pointer}
.pbsv-root img, .pbsv-root svg{display:block;max-width:100%}
.pbsv-root h1, .pbsv-root h2, .pbsv-root h3, .pbsv-root h4, .pbsv-root p{margin:0}
.pbsv-root :focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:8px}
.pbsv-root .wrap{width:100%;max-width:1240px;margin:0 auto;padding:0 24px}
.pbsv-root .ic{width:1.25em;height:1.25em;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.pbsv-root .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.pbsv-root .h-xl{font-size:clamp(42px,7.2vw,88px);line-height:.96;letter-spacing:-.04em;font-weight:800;text-transform:uppercase}
.pbsv-root .h-lg{font-size:clamp(32px,4.6vw,56px);line-height:1;letter-spacing:-.035em;font-weight:800;text-transform:uppercase;max-width:16ch}
.pbsv-root .h-md{font-size:clamp(26px,3.2vw,40px);line-height:1.05;letter-spacing:-.03em;font-weight:800}
.pbsv-root .lead{font-size:clamp(16px,1.35vw,18px);color:var(--mu);max-width:58ch}
.pbsv-root .gt{background:var(--g-primary);-webkit-background-clip:text;background-clip:text;color:transparent}
.pbsv-root .gt.en{background-image:var(--g-energy)}
.pbsv-root .mu{color:var(--mu)}
.pbsv-root .sec-h{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px 40px;margin-bottom:44px}
.pbsv-root .sec-h .lead{margin-top:16px}
.pbsv-root .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:0 22px;border-radius:14px;border:1px solid transparent;font-weight:700;font-size:15px;line-height:1;white-space:nowrap;transition:transform .3s var(--ease),box-shadow .3s var(--ease),background .3s,border-color .3s,filter .3s}
.pbsv-root .btn.sm{min-height:40px;padding:0 15px;font-size:13.5px;border-radius:11px}
.pbsv-root .btn-p{background:var(--g-cta);color:#fff;box-shadow:0 10px 30px -10px rgba(91,84,246,.75),inset 0 1px 0 rgba(255,255,255,.25)}
.pbsv-root .btn-p:hover{transform:translateY(-2px);box-shadow:0 18px 40px -10px rgba(91,84,246,.9),inset 0 1px 0 rgba(255,255,255,.3);filter:brightness(1.08)}
.pbsv-root .btn-g{background:var(--card);border-color:var(--ln);color:var(--tx);-webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur)}
.pbsv-root .grad .btn-g, .pbsv-root .ink .btn-g{border-color:rgba(255,255,255,.28)}
.pbsv-root .btn-g:hover{transform:translateY(-2px);border-color:var(--blue)}
.pbsv-root .btn-w{background:#fff;color:#0B1220}
.pbsv-root .btn-w:hover{transform:translateY(-2px);box-shadow:0 18px 40px -14px rgba(0,0,0,.5)}
.pbsv-root .lnk{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:15px;position:relative}
.pbsv-root .lnk::after{content:"";position:absolute;left:0;right:26px;bottom:-4px;height:2px;background:var(--g-primary);transform:scaleX(0);transform-origin:left;transition:transform .4s var(--ease)}
.pbsv-root .lnk:hover::after{transform:scaleX(1)}
.pbsv-root .lnk .ic{transition:transform .3s var(--ease)}
.pbsv-root .lnk:hover .ic{transform:translateX(4px)}
.pbsv-root .nav{position:fixed;z-index:60;left:0;right:0;top:calc(14px + env(safe-area-inset-top,0px));padding:0 16px;pointer-events:none}
.pbsv-root .nav-in{pointer-events:auto;max-width:1240px;margin:0 auto;height:64px;padding:0 10px 0 22px;display:flex;align-items:center;gap:6px;border-radius:20px;background:rgba(8,14,32,.62);border:1px solid rgba(255,255,255,.10);-webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);transition:background .3s,box-shadow .3s;color:var(--tx)}
.pbsv-root .nav.solid .nav-in{background:rgba(6,11,26,.9);box-shadow:0 20px 50px -24px rgba(0,0,0,.8)}
.pbsv-root .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;letter-spacing:-.03em;margin-right:auto}
.pbsv-root .logo i{width:30px;height:30px;border-radius:10px;background:var(--g-primary);display:grid;place-items:center;position:relative}
.pbsv-root .logo i::before{content:"";border-left:9px solid #fff;border-top:6px solid transparent;border-bottom:6px solid transparent;margin-left:2px}
.pbsv-root .logo span{color:var(--mu);font-weight:600}
.pbsv-root .nl{display:flex;align-items:center;gap:6px;height:40px;padding:0 13px;border-radius:11px;font-size:14.5px;font-weight:600;color:var(--mu);background:none;border:0;transition:color .2s,background .2s}
.pbsv-root .nl:hover, .pbsv-root .nl.on, .pbsv-root .nl[aria-expanded="true"]{color:#fff;background:rgba(255,255,255,.07)}
.pbsv-root .nl .ic{width:14px;height:14px;transition:transform .3s}
.pbsv-root .nl[aria-expanded="true"] .ic{transform:rotate(180deg)}
.pbsv-root .nav-s{display:flex;align-items:center;gap:10px;height:40px;padding:0 12px;margin:0 6px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:var(--mu);font-size:13px}
.pbsv-root .nav-s kbd{font:600 11px/1 inherit;padding:4px 6px;border-radius:6px;background:rgba(255,255,255,.08);color:var(--mu)}
.pbsv-root .nav-m{display:none;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);place-items:center}
.pbsv-root .mega{pointer-events:auto;position:absolute;left:16px;right:16px;top:74px;max-width:1240px;margin:0 auto;padding:28px;border-radius:24px;background:rgba(7,12,28,.96);border:1px solid rgba(255,255,255,.10);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);box-shadow:0 40px 80px -30px #000;display:grid;grid-template-columns:repeat(4,1fr) 1.5fr;gap:26px;opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .25s,transform .35s var(--ease),visibility .25s;color:var(--tx)}
.pbsv-root .mega.open{opacity:1;visibility:visible;transform:none}
.pbsv-root .mega h4{font-size:12px;font-weight:700;color:var(--mu);margin-bottom:10px;padding-left:10px}
.pbsv-root .mega a.mi{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;font-weight:600;font-size:15px}
.pbsv-root .mega a.mi:hover{background:rgba(255,255,255,.06)}
.pbsv-root .mega a.mi .ic{color:var(--c2)}
.pbsv-root .mega-c{position:relative;border-radius:18px;padding:20px;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;min-height:230px;background:linear-gradient(140deg,#3B82F6,#7C3AED 60%,#EC4899)}
.pbsv-root .mega-c .mk{position:absolute;right:-30px;top:-22px;--fs:8.5px;transform:rotate(-6deg)}
.pbsv-root .mega-c b{font-size:20px;letter-spacing:-.02em;position:relative}
.pbsv-root .mega-c span{font-size:13.5px;color:rgba(255,255,255,.85);position:relative;display:flex;gap:6px;align-items:center;margin-top:4px}
.pbsv-root .sheet-nav{position:fixed;inset:0;z-index:70;background:rgba(5,8,22,.97);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);padding:calc(24px + env(safe-area-inset-top,0px)) 24px 32px;display:none;flex-direction:column;gap:4px;overflow:auto;color:#F8FAFC}
.pbsv-root .sheet-nav.open{display:flex}
.pbsv-root .sheet-nav a{font-size:28px;font-weight:800;letter-spacing:-.03em;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)}
.pbsv-root .sheet-nav .btn{font-size:16px;margin-top:20px;border:0}
.pbsv-root .sheet-x{align-self:flex-end;width:48px;height:48px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:none;display:grid;place-items:center;color:#fff}
.pbsv-root main{min-height:60vh}
.pbsv-root .sec{position:relative;padding:clamp(72px,9vw,128px) 0;color:var(--tx)}
.pbsv-root .sec.paper, .pbsv-root .sec.grad{margin:0 12px;border-radius:clamp(28px,4vw,52px);background:var(--bg)}
.pbsv-root .sec.grad{background:
   radial-gradient(60% 80% at 0% 0%,rgba(34,211,238,.35),transparent 60%),
   radial-gradient(60% 80% at 100% 100%,rgba(236,72,153,.38),transparent 60%),
   linear-gradient(125deg,#1E3A8A,#4C1D95 55%,#6D28D9);overflow:hidden}
.pbsv-root .sec.grad::before{content:"";position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E");mix-blend-mode:overlay;opacity:.5;pointer-events:none}
.pbsv-root .sec.paper{box-shadow:0 0 0 1px var(--ln)}
.pbsv-root .sec>.wrap{position:relative}
.pbsv-root .page{padding-top:calc(118px + env(safe-area-inset-top,0px))}
.pbsv-root #app.enter{animation:pbsv-pg .45s var(--ease)}
@keyframes pbsv-pg{from{opacity:0;transform:translateY(12px)}
}
.pbsv-root [data-rv]{opacity:0}
.pbsv-root [data-rv].in{opacity:1;animation:pbsv-rise .65s var(--ease) backwards;animation-delay:calc(var(--i,0)*70ms)}
@keyframes pbsv-rise{from{opacity:0;transform:translateY(22px) scale(.985)}
}
.pbsv-root .hero{position:relative;overflow:hidden;background:var(--navy);color:var(--tx);padding:calc(150px + env(safe-area-inset-top,0px)) 0 96px;border-radius:0 0 clamp(28px,4vw,52px) clamp(28px,4vw,52px)}
.pbsv-root .hero::before{content:"";position:absolute;inset:0;background:
   radial-gradient(46% 50% at 6% 0%,rgba(34,211,238,.30),transparent 70%),
   radial-gradient(42% 52% at 62% 38%,rgba(124,58,237,.34),transparent 70%),
   radial-gradient(40% 46% at 100% 100%,rgba(255,122,24,.24),transparent 70%)}
.pbsv-root .hero::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px) 0 0/56px 56px,linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px) 0 0/56px 56px;-webkit-mask:radial-gradient(70% 70% at 50% 30%,#000,transparent);mask:radial-gradient(70% 70% at 50% 30%,#000,transparent)}
.pbsv-root .hero .wrap{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.02fr) minmax(0,1fr);gap:40px;align-items:center}
.pbsv-root .hero.slim{padding-bottom:72px}
.pbsv-root .pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:99px;border:1px solid var(--ln);background:var(--card);font-size:13px;font-weight:600;color:var(--tx);-webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur)}
.pbsv-root .pill i{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 0 12px var(--c2)}
.pbsv-root .hero h1{margin:22px 0 24px;font-size:clamp(40px,5.8vw,78px)}
.pbsv-root .hero .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.pbsv-root .hv{position:relative;height:560px;perspective:1600px}
.pbsv-root .hv-glow{position:absolute;left:6%;right:2%;bottom:2%;height:46%;background:radial-gradient(closest-side,rgba(124,58,237,.55),rgba(34,211,238,.25) 60%,transparent);filter:blur(50px)}
.pbsv-root .hv-l{position:absolute;transition:transform .5s var(--ease);will-change:transform}
.pbsv-root .hv-l>*{animation:pbsv-flt 9s ease-in-out infinite;animation-delay:var(--dl,0s)}
@keyframes pbsv-flt{50%{transform:translateY(-12px)}
}
.pbsv-root .hv-dash{left:0;top:9%;transform-style:preserve-3d}
.pbsv-root .hv-dash .mk{--fs:clamp(11px,1.35vw,18.5px);transform:rotateY(-13deg) rotateX(5deg) rotateZ(1deg);transform-origin:left center;animation:none}
.pbsv-root .hv-phone{right:3%;bottom:0}
.pbsv-root .hv-phone .mkp{--fs:clamp(10px,1.1vw,14.5px)}
.pbsv-root .hv-prod{right:0;top:0}
.pbsv-root .hv-kpi{left:2%;bottom:5%}
.pbsv-root .hv-prof{right:36%;bottom:-2%}
.pbsv-root .hv-badge{left:16%;top:0}
.pbsv-root .fc{background:rgba(13,20,44,.72);border:1px solid rgba(255,255,255,.14);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);border-radius:18px;padding:14px;box-shadow:0 30px 60px -24px rgba(0,0,0,.8);color:#F8FAFC;font-size:13px}
.pbsv-root .fc small{color:#9AA7C2;font-size:11.5px;display:block}
.pbsv-root .fc b{font-size:22px;letter-spacing:-.03em}
.pbsv-root .fc-prod{width:168px}
.pbsv-root .fc-prod .ph{height:112px;border-radius:12px;background:linear-gradient(135deg,#FF7A18,#EC4899);display:grid;place-items:center;margin-bottom:10px}
.pbsv-root .fc-prod .ph i{width:54px;height:70px;border-radius:14px 14px 20px 20px;background:rgba(255,255,255,.92);box-shadow:0 14px 24px -8px rgba(0,0,0,.4)}
.pbsv-root .fc-prod b{font-size:15px}
.pbsv-root .fc-kpi{width:190px}
.pbsv-root .fc-kpi svg{margin-top:6px;height:44px;width:100%}
.pbsv-root .fc-prof{display:flex;gap:10px;align-items:center;padding:10px 14px 10px 10px}
.pbsv-root .fc-prof i{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#22D3EE,#10B981);display:grid;place-items:center;font-style:normal;font-weight:800;color:#04121d}
.pbsv-root .fc-prof em{font-style:normal;font-size:11px;font-weight:700;color:#10B981;margin-left:10px}
.pbsv-root .fc-badge{display:flex;gap:10px;align-items:center;padding:10px 16px;border-radius:99px;font-weight:700}
.pbsv-root .fc-badge b{font-size:18px;background:var(--g-energy);-webkit-background-clip:text;background-clip:text;color:transparent}
.pbsv-root .mk{font-size:var(--fs,10px);width:28em;height:17.5em;border-radius:1em;overflow:hidden;background:var(--k-bg,#fff);color:var(--k-tx,#0b1220);box-shadow:0 2.2em 4em -1.6em rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.14);display:flex;flex-direction:column;flex:none;text-align:left;line-height:1.3;font-weight:600}
.pbsv-root .mk-bar{height:1.7em;flex:none;display:flex;align-items:center;gap:.35em;padding:0 .8em;background:var(--k-bar,rgba(8,20,38,.06))}
.pbsv-root .mk-bar i{width:.5em;height:.5em;border-radius:50%;background:currentColor;opacity:.28}
.pbsv-root .mk-bar span{margin-left:.8em;flex:1;height:.8em;border-radius:1em;background:currentColor;opacity:.09;max-width:12em}
.pbsv-root .mk-body{flex:1;display:flex;min-height:0}
.pbsv-root .mk-side{width:5.2em;flex:none;background:var(--k-side,#0b1220);padding:.9em .7em;display:flex;flex-direction:column;gap:.6em}
.pbsv-root .mk-side b{height:1em;width:1em;border-radius:.3em;background:linear-gradient(135deg,var(--c1),var(--c2));margin-bottom:.4em}
.pbsv-root .mk-side i{height:.45em;border-radius:1em;background:var(--k-sl,#fff);opacity:.2}
.pbsv-root .mk-side i.on{opacity:1;background:linear-gradient(90deg,var(--c1),var(--c2))}
.pbsv-root .mk-main{flex:1;padding:.9em;display:grid;gap:.7em;grid-template-rows:auto 1fr;min-width:0}
.pbsv-root .mk-k{display:grid;grid-template-columns:repeat(3,1fr);gap:.6em}
.pbsv-root .mk-k div{background:var(--k-card,#f1f5fb);border-radius:.6em;padding:.5em .65em}
.pbsv-root .mk-k small{display:block;font-size:.55em;opacity:.6;font-weight:600}
.pbsv-root .mk-k b{font-size:1.05em;letter-spacing:-.03em;font-weight:800}
.pbsv-root .mk-ch{background:var(--k-card,#f1f5fb);border-radius:.6em;position:relative;overflow:hidden;min-height:0}
.pbsv-root .mk-ch svg{position:absolute;inset:0;width:100%;height:100%}
.pbsv-root .mk-ch .l{fill:none;stroke:var(--c1);stroke-width:2.2;vector-effect:non-scaling-stroke}
.pbsv-root .mk-ch .a{fill:var(--c1);opacity:.14}
.pbsv-root .mk-ch .l2{fill:none;stroke:var(--c2);stroke-width:1.6;stroke-dasharray:3 3;vector-effect:non-scaling-stroke;opacity:.9}
.pbsv-root .t-fin, .pbsv-root .t-log, .pbsv-root .t-ai{--k-bg:#06122a;--k-card:rgba(255,255,255,.07);--k-side:#040b1c;--k-tx:#eaf4ff;--k-bar:rgba(255,255,255,.06)}
.pbsv-root .t-ai{--k-bg:#0b0720;--k-side:#070414}
.pbsv-root .t-hlth{--k-bg:#f0fafb;--k-card:#fff;--k-side:#fff;--k-sl:#0b1220}
.pbsv-root .t-edu{--k-bg:#faf8ff;--k-card:#fff;--k-side:#2e1065}
.pbsv-root .mk-site{flex:1;padding:1em 1.2em;display:flex;flex-direction:column;gap:.9em;background:linear-gradient(180deg,#fff,#eef4ff)}
.pbsv-root .ms-nav{display:flex;gap:.7em;align-items:center}
.pbsv-root .ms-nav b{width:1em;height:1em;border-radius:.3em;background:linear-gradient(135deg,var(--c1),var(--c2));margin-right:auto}
.pbsv-root .ms-nav i{width:2.2em;height:.4em;border-radius:1em;background:#0b1220;opacity:.2}
.pbsv-root .ms-nav u{width:3.4em;height:1.2em;border-radius:.4em;background:#0b1220}
.pbsv-root .ms-hero{flex:1;display:grid;grid-template-columns:1.15fr 1fr;gap:1em;align-items:center}
.pbsv-root .ms-hero h6{margin:0;font-size:1.75em;line-height:1;letter-spacing:-.04em;font-weight:800}
.pbsv-root .ms-hero p{height:.4em;border-radius:1em;background:#0b1220;opacity:.16;margin:.7em 0 0;width:90%}
.pbsv-root .ms-hero span{display:block;width:4.6em;height:1.4em;border-radius:.45em;margin-top:.9em;background:linear-gradient(90deg,var(--c1),var(--c2))}
.pbsv-root .ms-img{align-self:stretch;border-radius:.8em;background:radial-gradient(circle at 70% 30%,rgba(255,255,255,.7),transparent 40%),linear-gradient(135deg,var(--c1),var(--c2))}
.pbsv-root .ms-row{display:grid;grid-template-columns:repeat(3,1fr);gap:.6em}
.pbsv-root .ms-row i{height:2em;border-radius:.5em;background:#fff;box-shadow:0 .2em .6em rgba(8,20,38,.08)}
.pbsv-root .mk-store{flex:1;background:#FFF8EE;padding:.9em;display:grid;grid-template-rows:auto 1fr;gap:.7em}
.pbsv-root .st-ban{border-radius:.7em;padding:.8em 1em;background:linear-gradient(110deg,var(--c1),var(--c2));color:#fff;font-size:1.2em;font-weight:800;letter-spacing:-.03em;display:flex;justify-content:space-between;align-items:center}
.pbsv-root .st-ban em{font-style:normal;font-size:.5em;background:#fff;color:#0b1220;border-radius:1em;padding:.4em .9em}
.pbsv-root .st-g{display:grid;grid-template-columns:repeat(4,1fr);gap:.6em}
.pbsv-root .st-g div{background:#fff;border-radius:.6em;padding:.5em;display:flex;flex-direction:column;gap:.35em}
.pbsv-root .st-g i{flex:1;border-radius:.45em;min-height:3em}
.pbsv-root .st-g i:nth-child(1){background:#FFE4CC}
.pbsv-root .st-g div:nth-child(2) i{background:#FCE0EF}
.pbsv-root .st-g div:nth-child(3) i{background:#E3E9FF}
.pbsv-root .st-g div:nth-child(4) i{background:#DDF7EC}
.pbsv-root .st-g u{height:.35em;border-radius:1em;background:#0b1220;opacity:.2;width:80%}
.pbsv-root .st-g b{font-size:.7em}
.pbsv-root .mk-crm{flex:1;background:#f4f7fb;padding:.9em;display:grid;grid-template-columns:repeat(4,1fr);gap:.55em}
.pbsv-root .mk-crm div{background:#e9eef7;border-radius:.6em;padding:.45em;display:flex;flex-direction:column;gap:.4em}
.pbsv-root .mk-crm h6{margin:0;font-size:.6em;display:flex;gap:.5em;align-items:center}
.pbsv-root .mk-crm h6::before{content:"";width:.9em;height:.9em;border-radius:50%;background:var(--s)}
.pbsv-root .mk-crm i{height:2.5em;border-radius:.45em;background:#fff;border-left:.25em solid var(--s);box-shadow:0 .15em .4em rgba(8,20,38,.08)}
.pbsv-root .mk-ai{flex:1;display:grid;grid-template-columns:1fr 1.5fr;gap:.9em;padding:1em;background:radial-gradient(60% 80% at 20% 40%,rgba(168,85,247,.35),transparent),#0b0720}
.pbsv-root .orb{width:5.4em;height:5.4em;border-radius:50%;margin:auto;background:conic-gradient(from 0deg,#A855F7,#22D3EE,#3B82F6,#A855F7);filter:blur(.15em);box-shadow:0 0 2.4em rgba(168,85,247,.8),inset 0 0 1.2em rgba(255,255,255,.5);animation:pbsv-spin 8s linear infinite}
@keyframes pbsv-spin{to{transform:rotate(360deg)}
}
.pbsv-root .ai-c{display:flex;flex-direction:column;gap:.5em;justify-content:center}
.pbsv-root .ai-c i{height:1.5em;border-radius:.7em;background:rgba(255,255,255,.09);width:85%}
.pbsv-root .ai-c i.me{align-self:flex-end;width:55%;background:linear-gradient(90deg,#7C3AED,#3B82F6)}
.pbsv-root .ai-c u{height:1.7em;border-radius:.7em;border:1px solid rgba(34,211,238,.6);margin-top:.3em}
.pbsv-root .mkp{font-size:var(--fs,10px);width:9.6em;height:19.5em;border-radius:2.1em;background:#0b1220;padding:.42em;box-shadow:0 2.2em 4em -1.4em rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.2);flex:none;position:relative}
.pbsv-root .mkp::before{content:"";position:absolute;top:.85em;left:50%;width:2.6em;height:.65em;margin-left:-1.3em;border-radius:1em;background:#0b1220;z-index:1}
.pbsv-root .mkp-s{height:100%;border-radius:1.75em;overflow:hidden;background:#fff;display:flex;flex-direction:column;gap:.55em;padding:2em .7em .6em;color:#0b1220}
.pbsv-root .mkp-h{border-radius:1em;padding:.8em;color:#fff;background:linear-gradient(140deg,var(--c1),var(--c2))}
.pbsv-root .mkp-h small{font-size:.55em;opacity:.85;display:block}
.pbsv-root .mkp-h b{font-size:1.25em;letter-spacing:-.03em;font-weight:800}
.pbsv-root .mkp-r{display:flex;gap:.5em;align-items:center}
.pbsv-root .mkp-r i{width:1.5em;height:1.5em;border-radius:.5em;background:linear-gradient(135deg,var(--c1),var(--c2));opacity:.85}
.pbsv-root .mkp-r u{flex:1;height:.4em;border-radius:1em;background:#0b1220;opacity:.14}
.pbsv-root .mkp-t{margin-top:auto;display:flex;justify-content:space-around;padding:.5em 0 .2em}
.pbsv-root .mkp-t i{width:1em;height:1em;border-radius:.35em;background:#0b1220;opacity:.16}
.pbsv-root .mkp-t i.on{opacity:1;background:var(--c1)}
.pbsv-root .mk-brand{flex:1;display:grid;grid-template-columns:1.1fr 1fr;background:#fff}
.pbsv-root .br-l{background:linear-gradient(140deg,var(--c1),var(--c2));display:grid;place-items:center;color:#fff;font-size:5.4em;font-weight:800;letter-spacing:-.06em}
.pbsv-root .br-r{padding:1em;display:flex;flex-direction:column;gap:.6em;justify-content:center}
.pbsv-root .br-r b{font-size:2.3em;letter-spacing:-.05em;line-height:1;font-weight:800}
.pbsv-root .br-r div{display:flex;gap:.3em}
.pbsv-root .br-r div i{flex:1;height:1.9em;border-radius:.4em}
.pbsv-root .br-r u{height:.38em;border-radius:1em;background:#0b1220;opacity:.15}
.pbsv-root .mk-ill{flex:1;display:grid;grid-template-columns:1.2fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:.5em;padding:.7em;background:#fff}
.pbsv-root .mk-ill i{border-radius:.6em;position:relative;overflow:hidden}
.pbsv-root .mk-ill i::after{content:"";position:absolute;width:60%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.5);right:-12%;bottom:-18%}
.pbsv-root .mk-ill i:nth-child(1){grid-row:span 2;background:linear-gradient(160deg,#FBBF24,#EC4899)}
.pbsv-root .mk-ill i:nth-child(2){background:linear-gradient(160deg,#22D3EE,#3B82F6)}
.pbsv-root .mk-ill i:nth-child(3){background:linear-gradient(160deg,#A855F7,#EC4899)}
.pbsv-root .mk-ill i:nth-child(4){background:linear-gradient(160deg,#10B981,#22D3EE)}
.pbsv-root .mk-ill i:nth-child(5){background:linear-gradient(160deg,#FF7A18,#FBBF24)}
.pbsv-root .trust{display:flex;flex-wrap:wrap;gap:12px 34px;justify-content:space-between;padding:26px 0;border-bottom:1px solid var(--ln);color:var(--mu);font-weight:600;font-size:15px}
.pbsv-root .trust span{display:flex;gap:10px;align-items:center}
.pbsv-root .trust .ic{color:var(--cyan)}
.pbsv-root .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding-top:56px}
.pbsv-root .stat b{display:block;font-size:clamp(44px,6vw,84px);font-weight:800;letter-spacing:-.05em;line-height:1;background:var(--g-primary);-webkit-background-clip:text;background-clip:text;color:transparent}
.pbsv-root .stat:nth-child(even) b{background-image:var(--g-energy)}
.pbsv-root .stat span{display:block;margin-top:10px;color:var(--mu);font-weight:600;font-size:15px}
.pbsv-root .glow{position:relative;border-radius:var(--r);background:var(--card);border:1px solid var(--ln);-webkit-backdrop-filter:var(--blur);backdrop-filter:var(--blur);box-shadow:var(--sh);transition:transform .45s var(--ease),border-color .3s,box-shadow .45s var(--ease)}
.pbsv-root .glow::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1px;background:radial-gradient(260px circle at var(--mx,50%) var(--my,0%),var(--c1),var(--c2) 40%,transparent 70%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);opacity:0;transition:opacity .35s;pointer-events:none}
.pbsv-root .glow:hover::before, .pbsv-root .glow:focus-within::before{opacity:1}
.pbsv-root .cats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.pbsv-root .cat{display:flex;flex-direction:column;padding:22px;min-height:316px;overflow:hidden;transform:perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))}
.pbsv-root .cat::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(150deg,var(--c1),var(--c2));opacity:.07;transition:opacity .4s;pointer-events:none}
.pbsv-root .cat:hover::after{opacity:.16}
.pbsv-root .cat:hover{box-shadow:0 30px 60px -30px var(--c1)}
.pbsv-root .cat-i{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff;box-shadow:0 12px 26px -10px var(--c1);position:relative;z-index:1}
.pbsv-root .cat-i .ic{width:26px;height:26px}
.pbsv-root .cat h3{font-size:22px;letter-spacing:-.025em;margin:48px 0 6px;position:relative;z-index:1}
.pbsv-root .cat p{color:var(--mu);font-size:14.5px;line-height:1.5;max-width:26ch;position:relative;z-index:1}
.pbsv-root .cat-f{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:var(--mu);position:relative;z-index:1}
.pbsv-root .cat-f i{width:38px;height:38px;border-radius:50%;border:1px solid var(--ln);display:grid;place-items:center;color:var(--tx);transition:transform .35s var(--ease),background .3s,color .3s}
.pbsv-root .cat:hover .cat-f i{transform:translateX(4px);background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff;border-color:transparent}
.pbsv-root .cat-g{position:absolute;right:-30px;top:14px;--fs:5.5px;transform:rotate(8deg);opacity:.92;transition:transform .5s var(--ease);pointer-events:none}
.pbsv-root .cat-g.mkp{right:18px;top:-14px;--fs:6.6px}
.pbsv-root .cat:hover .cat-g{transform:rotate(5deg) translateY(-8px)}
.pbsv-root .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}
.pbsv-root .svc{display:flex;flex-direction:column;overflow:hidden}
.pbsv-root .svc:hover{transform:translateY(-6px);box-shadow:0 34px 70px -34px var(--c1)}
.pbsv-root .pv{position:relative;height:196px;display:grid;place-items:center;overflow:hidden;border-radius:calc(var(--r) - 1px) calc(var(--r) - 1px) 0 0;background:radial-gradient(90% 120% at 80% 0%,rgba(255,255,255,.28),transparent 55%),linear-gradient(140deg,var(--c1),var(--c2))}
.pbsv-root .pv>.mk, .pbsv-root .pv>.mkp{transition:transform .6s var(--ease)}
.pbsv-root .pv>.mk{--fs:8.6px;transform:translateY(16px) rotate(-3deg)}
.pbsv-root .pv>.mkp{--fs:9.5px;transform:translateY(34px) rotate(6deg)}
.pbsv-root .svc:hover .pv>.mk{transform:translateY(12px) rotate(-3deg) scale(1.03)}
.pbsv-root .svc:hover .pv>.mkp{transform:translateY(28px) rotate(6deg) scale(1.03)}
.pbsv-root .badge{position:absolute;left:14px;top:14px;padding:6px 11px;border-radius:99px;background:rgba(5,8,22,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;font-size:12px;font-weight:700;z-index:2}
.pbsv-root .svc-b{padding:20px;display:flex;flex-direction:column;gap:12px;flex:1}
.pbsv-root .svc h3{font-size:20px;line-height:1.2;letter-spacing:-.025em}
.pbsv-root .svc p{color:var(--mu);font-size:14.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pbsv-root .svc-m{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;padding-top:4px}
.pbsv-root .svc-m small{display:block;color:var(--mu);font-size:12px;font-weight:600}
.pbsv-root .svc-m b{font-size:20px;letter-spacing:-.03em}
.pbsv-root .svc-m span{display:flex;gap:6px;align-items:center;color:var(--mu);font-size:13px;font-weight:600;white-space:nowrap}
.pbsv-root .tags{display:flex;flex-wrap:wrap;gap:6px}
.pbsv-root .tags span{font-size:12px;font-weight:600;color:var(--mu);padding:4px 9px;border-radius:8px;background:var(--card2);border:1px solid var(--ln)}
.pbsv-root .svc-a{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto;padding-top:6px}
.pbsv-root .proc{position:relative;display:grid;grid-template-columns:repeat(6,1fr);gap:18px;padding-top:34px}
.pbsv-root .proc::before, .pbsv-root .proc-l{content:"";position:absolute;left:0;right:0;top:9px;height:3px;border-radius:3px;background:var(--ln)}
.pbsv-root .proc-l{right:auto;width:calc(var(--p,0)*100%);background:var(--g-primary);box-shadow:0 0 18px rgba(124,58,237,.7);transition:width .25s linear}
.pbsv-root .step{position:relative;padding-top:6px}
.pbsv-root .step::before{content:"";position:absolute;left:0;top:-34px;width:21px;height:21px;border-radius:50%;background:var(--bg2);border:3px solid #CBD5E1;transition:border-color .4s,box-shadow .4s}
.pbsv-root .step.on::before{border-color:var(--purple);box-shadow:0 0 0 6px rgba(124,58,237,.16)}
.pbsv-root .step b{font-size:14px;font-weight:800;color:var(--mu);transition:color .4s}
.pbsv-root .step.on b{color:var(--purple)}
.pbsv-root .step h3{font-size:24px;letter-spacing:-.03em;margin:6px 0 8px}
.pbsv-root .step p{font-size:14.5px;color:var(--mu);line-height:1.5}
.pbsv-root .tabs{position:relative;display:inline-flex;gap:2px;padding:5px;border-radius:16px;background:var(--card);border:1px solid var(--ln);max-width:100%;overflow-x:auto;scrollbar-width:none}
.pbsv-root .tabs::-webkit-scrollbar{display:none}
.pbsv-root .tabs button{position:relative;z-index:1;min-height:40px;padding:0 16px;border:0;background:none;border-radius:12px;font-weight:700;font-size:14px;color:var(--mu);white-space:nowrap;transition:color .3s;display:flex;align-items:center;gap:8px}
.pbsv-root .tabs button[aria-selected="true"], .pbsv-root .tabs button.on{color:#fff}
.pbsv-root .tabs-i{position:absolute;top:5px;bottom:5px;left:0;width:0;border-radius:12px;background:linear-gradient(110deg,var(--c1),var(--c2));transition:transform .45s var(--ease),width .45s var(--ease),--c1 .5s,--c2 .5s;box-shadow:0 8px 22px -8px var(--c1)}
.pbsv-root .stage{position:relative;margin-top:28px;transition:--c1 .6s,--c2 .6s}
.pbsv-root .stage::before{content:"";position:absolute;left:8%;right:8%;bottom:-30px;height:55%;background:linear-gradient(90deg,var(--c1),var(--c2));filter:blur(70px);opacity:.6;border-radius:50%;pointer-events:none}
.pbsv-root .frame{position:relative;margin:0 auto;border-radius:18px;overflow:hidden;background:#0c1224;border:1px solid rgba(255,255,255,.14);box-shadow:0 50px 100px -40px rgba(0,0,0,.85);transition:opacity .28s,transform .4s var(--ease),width .5s var(--ease)}
.pbsv-root .frame.swap{opacity:0;transform:scale(.98)}
.pbsv-root .chrome{height:40px;display:flex;align-items:center;gap:7px;padding:0 14px;background:#0c1224;color:#9AA7C2;font-size:12px;font-weight:600}
.pbsv-root .chrome i{width:11px;height:11px;border-radius:50%;background:#ff5f57}
.pbsv-root .chrome i:nth-child(2){background:#febc2e}
.pbsv-root .chrome i:nth-child(3){background:#28c840}
.pbsv-root .chrome span{margin:0 auto;padding:5px 16px;border-radius:8px;background:rgba(255,255,255,.07);max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pbsv-root .view{position:relative;overflow:hidden;background:#fff}
.pbsv-root .view iframe{border:0;display:block;transform-origin:0 0;background:#fff}
.pbsv-root .frame.tablet{border:12px solid #10172b;border-radius:30px}
.pbsv-root .frame.phone{border:11px solid #10172b;border-radius:48px;padding-top:26px;background:#10172b}
.pbsv-root .frame.phone::before{content:"";position:absolute;z-index:2;top:1px;left:50%;width:92px;height:24px;margin-left:-46px;border-radius:20px;background:#10172b}
.pbsv-root .frame.tablet .chrome, .pbsv-root .frame.phone .chrome{display:none}
.pbsv-root .stage.fs{position:fixed;inset:0;z-index:90;margin:0;background:#050816;padding:calc(env(safe-area-inset-top,0px)) 0 0}
.pbsv-root .stage.fs::before{display:none}
.pbsv-root .stage.fs .frame{border:0;border-radius:0;width:100%!important;height:100%}
.pbsv-root .fs-x{display:none}
.pbsv-root .stage.fs .fs-x{display:inline-flex;position:fixed;z-index:91;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px))}
.pbsv-root .dbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-top:26px}
.pbsv-root .projs{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.pbsv-root .proj{overflow:hidden;display:block}
.pbsv-root .proj .pv{height:270px}
.pbsv-root .proj .pv>.mk{--fs:11.5px}
.pbsv-root .proj .pv>.mkp{--fs:11.5px}
.pbsv-root .proj:hover{transform:translateY(-6px);box-shadow:0 34px 70px -34px var(--c1)}
.pbsv-root .proj:hover .pv>.mk{transform:translateY(12px) rotate(-3deg) scale(1.03)}
.pbsv-root .proj-b{padding:20px 22px 22px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.pbsv-root .proj-b h3{font-size:21px;letter-spacing:-.025em}
.pbsv-root .proj-b span{font-size:13.5px;color:var(--mu);font-weight:600}
.pbsv-root .proj-o{position:absolute;inset:0;z-index:3;display:flex;gap:8px;align-items:center;justify-content:center;background:rgba(5,8,22,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .35s}
.pbsv-root .proj:hover .proj-o, .pbsv-root .proj:focus-within .proj-o{opacity:1}
.pbsv-root .proj-o .btn-g{background:rgba(5,8,22,.55)}
@media (hover:none),(max-width:720px){
  .pbsv-root .proj-o{opacity:1;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;align-items:flex-end;padding-bottom:14px}
}
.pbsv-root .big{font-size:clamp(40px,8.6vw,132px);line-height:.92;letter-spacing:-.05em;font-weight:800;text-transform:uppercase}
.pbsv-root .big .ol{color:transparent;-webkit-text-stroke:1.5px var(--mu);opacity:.75}
.pbsv-root .big+.big{margin-top:.3em}
.pbsv-root .inds{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.pbsv-root .ind{position:relative;display:flex;flex-direction:column;justify-content:space-between;min-height:178px;padding:20px;border-radius:20px;border:1px solid var(--ln);overflow:hidden;background:var(--card);transition:transform .4s var(--ease),border-color .3s}
.pbsv-root .ind::before{content:"";position:absolute;inset:0;background:linear-gradient(150deg,var(--c1),var(--c2));opacity:.16;transition:opacity .4s}
.pbsv-root .ind:hover{transform:translateY(-4px);border-color:var(--c1)}
.pbsv-root .ind:hover::before{opacity:.34}
.pbsv-root .ind>*{position:relative}
.pbsv-root .ind .ic{width:26px;height:26px;color:var(--c2)}
.pbsv-root .ind b{font-size:18px;letter-spacing:-.02em;display:block}
.pbsv-root .ind span{font-size:13px;color:var(--mu);line-height:1.4;display:block;margin-top:2px}
.pbsv-root .prices{display:grid;grid-template-columns:1fr 1.08fr 1fr;gap:22px;align-items:center}
.pbsv-root .price{position:relative;padding:32px 28px;border-radius:26px;background:var(--card);border:1px solid var(--ln);box-shadow:var(--sh);display:flex;flex-direction:column;gap:18px}
.pbsv-root .price.pop{padding:44px 30px;border:0;background:linear-gradient(var(--bg2),var(--bg2)) padding-box,var(--g-primary) border-box;border:2px solid transparent;box-shadow:0 40px 80px -40px rgba(124,58,237,.7)}
.pbsv-root .price .tag{position:absolute;top:-14px;left:28px;padding:7px 14px;border-radius:99px;background:var(--g-cta);color:#fff;font-size:12px;font-weight:800;letter-spacing:.04em}
.pbsv-root .price h3{font-size:22px;letter-spacing:-.02em}
.pbsv-root .price small{color:var(--mu);font-weight:600;font-size:13px;display:block}
.pbsv-root .price .amt{font-size:clamp(30px,3vw,40px);font-weight:800;letter-spacing:-.04em;line-height:1.1}
.pbsv-root .price ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:15px}
.pbsv-root .price li{display:flex;gap:10px;align-items:flex-start}
.pbsv-root .price li .ic{color:var(--emerald);margin-top:3px}
.pbsv-root .price .btn{margin-top:auto}
.pbsv-root .tbl{overflow-x:auto;border-radius:20px;border:1px solid var(--ln);background:var(--card)}
.pbsv-root .tbl table{width:100%;border-collapse:collapse;font-size:14.5px}
.pbsv-root .tbl th, .pbsv-root .tbl td{padding:13px 16px;text-align:left;border-bottom:1px solid var(--ln);white-space:nowrap}
.pbsv-root .tbl th{font-size:12.5px;color:var(--mu);font-weight:700}
.pbsv-root .tbl tr:last-child td{border-bottom:0}
.pbsv-root .final{text-align:center}
.pbsv-root .final .h-xl{max-width:14ch;margin:0 auto}
.pbsv-root .final .cta{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:36px}
.pbsv-root footer{padding:72px 0 calc(110px + env(safe-area-inset-bottom,0px));color:var(--mu);font-size:14.5px}
.pbsv-root .foot{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:36px}
.pbsv-root .foot h4{font-size:13px;color:var(--tx);margin-bottom:12px}
.pbsv-root .foot a{display:block;padding:5px 0}
.pbsv-root .foot a:hover{color:var(--tx)}
.pbsv-root .foot .logo{color:var(--tx);margin-bottom:14px}
.pbsv-root .fine{margin-top:44px;padding-top:22px;border-top:1px solid var(--ln);font-size:13px;display:flex;flex-wrap:wrap;gap:10px 30px;justify-content:space-between}
.pbsv-root .fine p{max-width:74ch}
.pbsv-root .wa{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:40;display:flex;align-items:center;gap:9px;height:52px;padding:0 20px;border-radius:99px;background:#10B981;color:#04130d;font-weight:800;font-size:14.5px;box-shadow:0 16px 36px -12px rgba(16,185,129,.9);transition:transform .3s var(--ease),bottom .3s}
.pbsv-root .wa:hover{transform:translateY(-2px)}
.pbsv-root .chips{display:flex;gap:8px;overflow-x:auto;padding:4px 24px 14px;margin:0 -24px;scroll-snap-type:x proximity;scrollbar-width:none}
.pbsv-root .chips::-webkit-scrollbar{display:none}
@media (min-width:1081px){
  .pbsv-root .chips{flex-wrap:wrap;overflow:visible}
}
.pbsv-root .chip{scroll-snap-align:start;flex:none;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:99px;border:1px solid var(--ln);background:var(--card);color:var(--mu);font-weight:700;font-size:14px;transition:color .2s,border-color .2s}
.pbsv-root .chip:hover{color:var(--tx)}
.pbsv-root .chip.on{color:#fff;border-color:transparent;background:linear-gradient(110deg,var(--c1),var(--c2));box-shadow:0 10px 24px -10px var(--c1)}
.pbsv-root .chip small{opacity:.75;font-size:12px}
.pbsv-root .tools{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:14px 0 30px}
.pbsv-root .field{display:flex;align-items:center;gap:10px;min-height:48px;padding:0 14px;border-radius:14px;border:1px solid var(--ln);background:var(--card);color:var(--mu);flex:1 1 260px;max-width:420px}
.pbsv-root .field input{flex:1;min-width:0;border:0;background:none;outline:0;color:var(--tx)}
.pbsv-root select, .pbsv-root .inp{min-height:48px;padding:0 14px;border-radius:14px;border:1px solid var(--ln);background:var(--card);color:var(--tx);min-width:0}
.pbsv-root select option{color:#0B1220;background:#fff}
.pbsv-root textarea.inp{padding:12px 14px;min-height:110px;resize:vertical}
.pbsv-root .inp:focus, .pbsv-root select:focus, .pbsv-root .field:focus-within{border-color:var(--blue);outline:0;box-shadow:0 0 0 4px rgba(59,130,246,.18)}
.pbsv-root .empty{grid-column:1/-1;padding:56px 24px;text-align:center;border:1px dashed var(--ln);border-radius:var(--r);color:var(--mu)}
.pbsv-root .d-hero .wrap{grid-template-columns:minmax(0,1fr) minmax(0,.9fr)}
.pbsv-root .d-hero h1{font-size:clamp(38px,5.6vw,72px)}
.pbsv-root .d-vis{position:relative;display:grid;place-items:center;min-height:340px}
.pbsv-root .d-vis::before{content:"";position:absolute;inset:10% 6%;background:linear-gradient(120deg,var(--c1),var(--c2));filter:blur(70px);opacity:.6;border-radius:50%}
.pbsv-root .d-vis .mk{--fs:clamp(11px,1.5vw,17px);transform:rotate(-3deg);position:relative}
.pbsv-root .d-vis .mkp{--fs:clamp(13px,1.4vw,17px);transform:rotate(5deg);position:relative}
.pbsv-root .facts{display:flex;flex-wrap:wrap;gap:12px 34px;margin-top:28px}
.pbsv-root .facts small{display:block;color:var(--mu);font-size:12.5px;font-weight:600}
.pbsv-root .facts b{font-size:21px;letter-spacing:-.03em}
.pbsv-root .cols{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:22px}
.pbsv-root .box{padding:26px;border-radius:var(--r);background:var(--card);border:1px solid var(--ln);box-shadow:var(--sh)}
.pbsv-root .box h3{font-size:20px;letter-spacing:-.02em;margin-bottom:12px}
.pbsv-root .box p{color:var(--mu);font-size:15.5px}
.pbsv-root .box p+h3{margin-top:22px}
.pbsv-root .ticks{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:15.5px}
.pbsv-root .ticks li{display:flex;gap:10px}
.pbsv-root .ticks .ic{color:var(--c2);margin-top:3px}
.pbsv-root details.faq{border-bottom:1px solid var(--ln);padding:6px 0}
.pbsv-root details.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;gap:20px;align-items:center;padding:16px 0;font-weight:700;font-size:18px;letter-spacing:-.015em}
.pbsv-root details.faq summary::-webkit-details-marker{display:none}
.pbsv-root details.faq summary .ic{transition:transform .3s;color:var(--mu)}
.pbsv-root details.faq[open] summary .ic{transform:rotate(180deg)}
.pbsv-root details.faq p{color:var(--mu);padding:0 0 18px;max-width:70ch}
.pbsv-root .mbar{display:none}
.pbsv-root .est{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:32px;align-items:start}
.pbsv-root .est fieldset{border:0;margin:0 0 38px;padding:0;min-width:0}
.pbsv-root .est legend{padding:0;margin-bottom:16px;font-size:22px;font-weight:800;letter-spacing:-.025em;display:flex;gap:12px;align-items:baseline}
.pbsv-root .est legend span{font-size:14px;color:var(--mu);font-weight:700}
.pbsv-root .picks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.pbsv-root .picks.w{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.pbsv-root .pick{position:relative;display:block;cursor:pointer}
.pbsv-root .pick input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer}
.pbsv-root .pick div{height:100%;padding:16px;border-radius:18px;border:1.5px solid var(--ln);background:var(--card);display:flex;flex-direction:column;gap:8px;transition:transform .3s var(--ease),box-shadow .3s,border-color .3s}
.pbsv-root .pick:hover div{transform:translateY(-2px)}
.pbsv-root .pick .pi{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2))}
.pbsv-root .pick b{font-size:16px;letter-spacing:-.015em}
.pbsv-root .pick small{color:var(--mu);font-size:13px;line-height:1.4}
.pbsv-root .pick div::after{content:"";position:absolute;right:12px;top:12px;width:22px;height:22px;border-radius:50%;background:var(--g-cta) center/100%;opacity:0;transform:scale(.6);transition:.25s var(--ease);-webkit-mask:none}
.pbsv-root .pick svg.ck{position:absolute;right:16px;top:16px;width:14px;height:14px;color:#fff;z-index:1;opacity:0;stroke-width:3}
.pbsv-root .pick input:checked+div{border-color:transparent;background:linear-gradient(var(--bg2),var(--bg2)) padding-box,linear-gradient(120deg,var(--c1),var(--c2)) border-box;box-shadow:0 18px 40px -20px var(--c1)}
.pbsv-root .pick input:checked+div::after{opacity:1;transform:none}
.pbsv-root .pick input:checked~svg.ck{opacity:1}
.pbsv-root .pick input:focus-visible+div{outline:2px solid var(--cyan);outline-offset:3px}
.pbsv-root .pick input:disabled+div{opacity:.75}
.pbsv-root .fm{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pbsv-root .fm label{display:grid;gap:6px;font-size:13.5px;font-weight:700;color:var(--mu)}
.pbsv-root .fm .full{grid-column:1/-1}
.pbsv-root .err{color:#F87171;font-size:14px;font-weight:600;min-height:1em}
.pbsv-root .sum{position:sticky;top:104px;border-radius:26px;padding:28px;color:#fff;background:radial-gradient(90% 70% at 100% 0%,rgba(34,211,238,.4),transparent 60%),linear-gradient(150deg,#1E3A8A,#4C1D95 60%,#7C3AED);box-shadow:0 40px 80px -40px rgba(76,29,149,.9);overflow:hidden}
.pbsv-root .sum small{display:block;color:rgba(255,255,255,.75);font-weight:600;font-size:13px}
.pbsv-root .sum .rng{font-size:clamp(26px,2.6vw,34px);font-weight:800;letter-spacing:-.04em;line-height:1.15;margin:6px 0 18px}
.pbsv-root .sum dl{margin:0 0 20px;display:grid;gap:9px;font-size:14.5px}
.pbsv-root .sum dl div{display:flex;justify-content:space-between;gap:14px;padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,.14)}
.pbsv-root .sum dt{color:rgba(255,255,255,.75)}
.pbsv-root .sum dd{margin:0;font-weight:700;text-align:right}
.pbsv-root .sum .btn{width:100%;margin-top:8px}
.pbsv-root .sum p{font-size:13px;color:rgba(255,255,255,.75);margin-top:14px}
.pbsv-root .ok{padding:20px;border-radius:18px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.5);font-weight:600}
.pbsv-root .sum-x{display:none}
.pbsv-root .cmd{position:fixed;inset:0;z-index:100;display:none;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;background:rgba(3,6,16,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.pbsv-root .cmd.open{display:flex;animation:pbsv-pg .3s var(--ease)}
.pbsv-root .cmd-b{width:100%;max-width:680px;max-height:72vh;display:flex;flex-direction:column;border-radius:24px;overflow:hidden;background:#0A1124;border:1px solid rgba(255,255,255,.14);box-shadow:0 60px 120px -40px #000,0 0 0 1px rgba(124,58,237,.3);color:#F8FAFC}
.pbsv-root .cmd-i{display:flex;align-items:center;gap:12px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.1);color:#9AA7C2}
.pbsv-root .cmd-i input{flex:1;height:64px;border:0;background:none;outline:0;font-size:18px;color:#fff;min-width:0}
.pbsv-root .cmd-i kbd{font:600 11px/1 inherit;padding:5px 7px;border-radius:6px;background:rgba(255,255,255,.08)}
.pbsv-root .cmd-r{overflow:auto;padding:10px}
.pbsv-root .cmd-r h5{margin:10px 12px 6px;font-size:12px;color:#9AA7C2;font-weight:700}
.pbsv-root .cmd-r a{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-weight:600;font-size:15px}
.pbsv-root .cmd-r a i{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff;flex:none}
.pbsv-root .cmd-r a i .ic{width:17px;height:17px}
.pbsv-root .cmd-r a small{color:#9AA7C2;font-size:12.5px;margin-left:auto;white-space:nowrap}
.pbsv-root .cmd-r a>.ic{color:#9AA7C2;opacity:0}
.pbsv-root .cmd-r a.sel{background:rgba(255,255,255,.08)}
.pbsv-root .cmd-r a.sel>.ic{opacity:1}
.pbsv-root .cmd-r p{padding:26px 12px;color:#9AA7C2;text-align:center}
@media (max-width:1080px){
  .pbsv-root .nl, .pbsv-root .nav-s span, .pbsv-root .nav-s kbd, .pbsv-root .nav .btn{display:none}
  .pbsv-root .nav-s{width:44px;height:44px;padding:0;justify-content:center;margin:0 4px 0 0}
  .pbsv-root .nav-m{display:grid;color:#fff}
  .pbsv-root .mega{display:none}
  .pbsv-root .hero .wrap, .pbsv-root .d-hero .wrap{grid-template-columns:1fr}
  .pbsv-root .hv{height:clamp(330px,62vw,520px);margin-top:10px}
  .pbsv-root .hv-dash .mk{--fs:clamp(9px,2.1vw,17px)}
  .pbsv-root .hv-phone .mkp{--fs:clamp(8px,1.7vw,14px)}
  .pbsv-root .cats{grid-template-columns:repeat(2,1fr)}
  .pbsv-root .projs{grid-template-columns:repeat(2,1fr)}
  .pbsv-root .inds{grid-template-columns:repeat(3,1fr)}
  .pbsv-root .prices{grid-template-columns:1fr;max-width:520px;margin:0 auto}
  .pbsv-root .proc{grid-template-columns:repeat(3,1fr);row-gap:56px}
  .pbsv-root .proc::before, .pbsv-root .proc-l{display:none}
  .pbsv-root .step::before{top:-30px}
  .pbsv-root .proc{padding-top:30px}
  .pbsv-root .cols{grid-template-columns:1fr}
  .pbsv-root .est{grid-template-columns:1fr}
  .pbsv-root .foot{grid-template-columns:1fr 1fr}
  .pbsv-root .stats{grid-template-columns:repeat(2,1fr);row-gap:40px}
}
@media (max-width:720px){
  .pbsv-root .wrap{padding:0 18px}
  .pbsv-root .sec.paper, .pbsv-root .sec.grad{margin:0 6px}
  .pbsv-root .hero{padding-top:calc(124px + env(safe-area-inset-top,0px));padding-bottom:64px}
  .pbsv-root .hero .cta .btn, .pbsv-root .final .cta .btn{flex:1 1 100%;min-height:54px}
  .pbsv-root .hv-prod, .pbsv-root .hv-prof{display:none}
  .pbsv-root .hv-kpi{bottom:0}
  .pbsv-root .fc-kpi{width:150px}
  .pbsv-root .cats{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -18px;padding:4px 18px 18px;scrollbar-width:none}
  .pbsv-root .cats::-webkit-scrollbar{display:none}
  .pbsv-root .cat{flex:0 0 78%;scroll-snap-align:center;min-height:270px}
  .pbsv-root .projs{grid-template-columns:1fr}
  .pbsv-root .inds{grid-template-columns:repeat(2,1fr)}
  .pbsv-root .proc{grid-template-columns:repeat(2,1fr)}
  .pbsv-root .trust{justify-content:flex-start}
  .pbsv-root .chips{margin:0 -18px;padding:4px 18px 14px}
  .pbsv-root .fm{grid-template-columns:1fr}
  .pbsv-root .foot{grid-template-columns:1fr 1fr;gap:28px}
  .pbsv-root .foot>div:first-child{grid-column:1/-1}
  .pbsv-root .wa span{display:none}
  .pbsv-root .wa{width:54px;height:54px;padding:0;justify-content:center}
  .pbsv-root.has-bar .wa{bottom:calc(92px + env(safe-area-inset-bottom,0px))}
  .pbsv-root .mbar{display:grid;grid-template-columns:1fr 1fr;gap:10px;position:fixed;z-index:45;left:0;right:0;bottom:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:rgba(6,11,26,.92);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border-top:1px solid rgba(255,255,255,.1)}
  .pbsv-root .mbar .btn{min-height:50px}
  .pbsv-root.has-bar footer{padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))}
  .pbsv-root .sum{position:fixed;z-index:46;left:0;right:0;bottom:0;top:auto;border-radius:26px 26px 0 0;padding:16px 18px calc(16px + env(safe-area-inset-bottom,0px));max-height:82vh;overflow:auto}
  .pbsv-root .sum .rng{margin:12px 0 0;font-size:20px}
  .pbsv-root .sum-x{display:flex;position:absolute;right:12px;top:8px;height:34px;padding:0 14px;align-items:center;gap:6px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-weight:700;font-size:13px}
  .pbsv-root .sum:not(.open) dl, .pbsv-root .sum:not(.open) p, .pbsv-root .sum:not(.open) .btn{display:none}
  .pbsv-root .sum.open .rng{margin-bottom:16px}
  .pbsv-root .dbar{justify-content:flex-start}
  .pbsv-root #dtabs [data-dev], .pbsv-root #dtabs .tabs-i{display:none}
  .pbsv-root .cmd{padding-top:calc(16px + env(safe-area-inset-top,0px))}
  .pbsv-root .proj .pv{height:220px}
}
@media (prefers-reduced-motion:reduce){
  .pbsv-root *, .pbsv-root *::before, .pbsv-root *::after{animation:none!important;transition-duration:.01ms!important}
  .pbsv-root{scroll-behavior:auto}
  .pbsv-root [data-rv]{opacity:1}
}
.pbsv-root{position:relative;isolation:isolate}
}
`;
