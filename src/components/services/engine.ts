// AUTO-GENERATED from the owner's "Services — PlayBeat Digital v2" artifact.
// Storefront adaptations: path-based routing, real /api/service-requests submit,
// registered WhatsApp number, listener registry for React lifecycle.
/* eslint-disable */
// @ts-nocheck

/* ================= data ================= */
const CAT={web:"Websites",app:"Web Applications",saas:"SaaS",mob:"Mobile Apps",eco:"Ecommerce",shp:"Shopify",wf:"Webflow",fr:"Framer",dash:"Dashboards",ux:"UI/UX",brand:"Branding",logo:"Logo Design",ill:"Illustration",ent:"Enterprise Solutions"};
const TECH={web:"React, Node.js, CMS",app:"React, Node.js, MongoDB",saas:"React, Express, Stripe",mob:"React Native, API",eco:"React, Node, Payments",shp:"Shopify, Liquid",wf:"Webflow, CMS",fr:"Framer, Motion",dash:"React, Charts",ux:"Figma, Prototyping",brand:"Illustrator, Figma",logo:"Illustrator, SVG",ill:"Vector, Procreate",ent:"Node, Postgres, Cloud"};
const FEAT={web:["Custom UI/UX","Responsive layout","CMS","SEO foundations","Contact forms","Analytics","Admin panel","Performance tuning"],app:["Role-based access","Custom UI/UX","REST API","Admin panel","Secure auth","Reports"],saas:["Subscriptions & billing","Analytics","Multi-user roles","API","Admin panel","Scalable architecture"],mob:["iOS & Android","Custom UI/UX","Push notifications","API integration","Store-ready assets"],eco:["Product catalog","Cart & checkout","PKR payment gateways","Admin orders","SEO foundations"],shp:["Theme customization","Product setup","Payments","Speed optimization","Apps setup"],wf:["Custom design","CMS collections","Interactions","SEO foundations","Handover training"],fr:["Custom design","Animations","CMS","Responsive","Fast hosting"],dash:["Data widgets","Charts","Filters & tables","Dark/light themes","Design system"],ux:["User research","Wireframes","Prototype","Design system","Dev handoff"],brand:["Logo suite","Color & type","Guidelines","Stationery","Social kit"],logo:["3 concepts","Vector files","Black/white versions","Brand colors","Mockups"],ill:["Custom artwork","Vector source","Commercial license","Revisions","Style guide"],ent:["Custom architecture","SSO & roles","Audit logs","Integrations","SLA support"]};
const DESC={web:"Strategy, design and build for a site that explains what you do and turns visits into enquiries.",app:"A custom web application with roles, secure sign-in and the workflows your team runs every day.",saas:"Subscriptions, billing and analytics on an architecture that grows with your customer base.",mob:"A native-feeling iOS and Android experience, designed around what your users do most.",eco:"A catalogue, cart and checkout tuned for PKR payments and repeat orders.",shp:"A Shopify store set up properly: theme, products, payments and speed.",wf:"A Webflow site your team can edit and extend without a developer.",fr:"A fast, animated Framer site that is ready to launch in weeks.",dash:"Data-dense screens made readable with widgets, charts, filters and tables.",ux:"Research-led product design, from the first wireframe to developer handoff.",brand:"A consistent identity across logo, colour, type and every touchpoint.",logo:"A distinctive mark with the files and colour versions to use it anywhere.",ill:"Original artwork in your style, delivered as vector source with commercial rights.",ent:"Custom architecture with single sign-on, audit logs and the integrations you rely on."};
const SD={"Website Design":"Page designs for your whole site, ready for any developer to build.","Website Design + Development":"Designed and built end to end, with a CMS your team can update.","Corporate Website":"A multi-page company site with services, team, case studies and enquiry forms.","Landing Page Design":"One focused page design built around a single offer and a single action.","Landing Page Design + Development":"A campaign page designed, built and connected to analytics in about a week.","Website Redesign":"Your existing site restructured and restyled around clearer messaging.","Website UI Design":"Screen-by-screen interface design for a site you already have planned.","Web Application Design":"Flows and screens for a custom web app, tested as a clickable prototype.","Web Application Development":"A custom web app with roles, secure sign-in, reports and an admin panel.","SaaS Website Development":"A marketing site for your product, with pricing, features and sign-up.","SaaS Product Development":"A full subscription product with billing, roles, analytics and an API.","SaaS Dashboard Design":"The core screens of your product: KPIs, charts, tables and settings.","Enterprise Web Application":"CRM and workflow software with single sign-on, audit logs and integrations.","Mobile App UI/UX":"User flows and interface design for iOS and Android, from research to prototype.","Mobile App Design":"Every screen of your app designed, with store-ready assets.","Mobile App Development":"An iOS and Android app from one codebase, with push notifications and API integration.","AI Mobile App Design":"App screens designed around chat, prompts and AI-generated results.","AI Dashboard Design":"A workspace for prompts, agents and outputs that your team can follow at a glance.","Fintech Website":"A finance site that explains the product clearly and feels secure doing it.","Fintech Dashboard":"Balances, cards, transactions and analytics in one readable view.","Healthcare Dashboard":"Appointments, patients, reports and billing for a clinic or hospital team.","School & College Web Application":"Students, attendance, fees, courses and results in one system.","Supply Chain & Logistics Website":"A logistics site with shipment tracking, routes and service pages.","Ecommerce Website":"A custom store with catalogue, cart, checkout and PKR payment gateways.","Ecommerce UI/UX":"Product, cart and checkout screens designed to reduce drop-off.","Shopify Website Design":"A Shopify theme customised to your brand, with your products set up.","Shopify Development":"A complete Shopify build: theme, payments, apps and speed tuning.","Webflow Website":"A custom-designed Webflow site with CMS collections and interactions.","Webflow Development":"Your designs built in Webflow, with CMS, SEO foundations and handover training.","Framer Development":"A fast, animated Framer site with a CMS, live in two to three weeks.","Dashboard Design":"Data-dense screens made readable with widgets, charts, filters and tables.","UI/UX Design":"Research-led product design, from the first wireframe to developer handoff.","UI/UX Audit":"A review of your current product with a prioritised list of fixes.","Wireframing":"Low-fidelity layouts that settle structure before visual design starts.","UI Prototyping":"A clickable prototype you can put in front of users and investors.","Product Design":"End-to-end design for a new product: research, flows, UI and a design system.","Product Discovery & Strategy":"Workshops and research that define what to build first, and why.","Ongoing Product Design Support":"A monthly retainer for continuous design work on a live product.","Brand Identity":"A logo suite, colour and type, delivered with usage guidelines.","Branding Package":"The full identity plus stationery and a social media kit.","Logo Design":"Three concepts refined into one mark, with vector files and mockups.","Logo Redesign":"Your existing logo modernised while keeping what people recognise.","Wordmark Logo":"A custom-lettered name mark in black, white and brand colour versions.","Mascot Logo":"A character mark for your brand, drawn in vector for any size.","Typography Design":"A type system for your brand: pairings, sizes and usage rules.","Illustration":"Original artwork in your style, with vector source and commercial rights.","Character Design":"A custom character for your brand, delivered as vector source.","Isometric Illustration":"Isometric scenes for landing pages, decks and explainers.","Vector Illustration":"Clean vector artwork that scales from app icons to billboards.","Pitch Deck Design":"Your investor or sales deck redesigned so the story is easy to follow.","Animated Explainer Video":"A short animated video that explains your product in plain terms.","SaaS Animation":"Product UI animations for your website, launch and social posts.","Creative Design Sprint":"A focused week of design that takes one idea from brief to concept."};
const dsc=s=>SD[s.t]||DESC[s.c];
/* solution groups: name, gradient start, gradient end, icon, description */
const GR={
 web:["Websites","#3B82F6","#22D3EE","globe","Corporate sites, landing pages and redesigns that turn visits into enquiries."],
 saas:["SaaS & Web Apps","#7C3AED","#3B82F6","layers","Subscription products, dashboards and web applications built to scale."],
 mob:["Mobile Apps","#EC4899","#A855F7","phone","iOS and Android apps, from the first prototype to store release."],
 ai:["AI","#A855F7","#22D3EE","spark","Assistants, agents and AI-first interfaces your team will use daily."],
 eco:["Ecommerce","#FF7A18","#EC4899","bag","Online stores with PKR payments, Shopify builds and checkout design."],
 fin:["Fintech","#22D3EE","#10B981","card","Banking dashboards and finance sites that feel secure at first glance."],
 hlth:["Healthcare","#3B82F6","#2DD4BF","pulse","Patient, appointment and billing tools that stay calm under pressure."],
 edu:["Education","#7C3AED","#EC4899","cap","School and college systems for attendance, fees, courses and results."],
 log:["Logistics","#FF7A18","#FBBF24","truck","Shipment tracking, fleet views and customer-facing logistics sites."],
 brand:["Branding","#EC4899","#FF7A18","pen","Identity systems, logos, pitch decks and motion for brands that last."],
 ent:["Enterprise","#4F46E5","#3B82F6","building","CRM, workflow automation and internal platforms with roles and audit logs."],
 ux:["UI/UX","#A855F7","#EC4899","frame","Research, wireframes, prototypes and design systems ready for developers."],
 ill:["Illustration","#FBBF24","#EC4899","image","Custom vector, character and isometric artwork with commercial rights."]};
const R=`Website Design|web|site|90|7–10
Website Design + Development|web|site|150|14–21
Corporate Website|web|site|225|21–30
Landing Page Design|web|site|45|4–7
Landing Page Design + Development|web|site|75|7–10
Website Redesign|web|site|120|14–21
Website UI Design|ux|site|80|7–10
Web Application Design|app|saas|120|10–14
Web Application Development|app|saas|300|30–45
SaaS Website Development|saas|site|180|14–21
SaaS Product Development|saas|saas|600|60–90
SaaS Dashboard Design|dash|saas|150|10–14
Enterprise Web Application|ent|crm|1200|90–150
Mobile App UI/UX|mob|mob|120|10–14
Mobile App Design|mob|mob|150|10–14
Mobile App Development|mob|mob|450|45–75
AI Mobile App Design|mob|mob|180|10–14
AI Dashboard Design|dash|ai|180|10–14
Fintech Website|web|site|250|21–30
Fintech Dashboard|dash|fin|250|14–21
Healthcare Dashboard|dash|hlth|220|14–21
School & College Web Application|app|edu|350|45–60
Supply Chain & Logistics Website|web|log|200|21–30
Ecommerce Website|eco|store|250|30–45
Ecommerce UI/UX|eco|store|110|10–14
Shopify Website Design|shp|store|120|10–14
Shopify Development|shp|store|220|21–30
Webflow Website|wf|site|275|21–30
Webflow Development|wf|site|300|21–35
Framer Development|fr|site|225|14–21
Dashboard Design|dash|saas|150|10–14
UI/UX Design|ux|mob|120|14–21
UI/UX Audit|ux|saas|55|5–7
Wireframing|ux|site|40|5–7
UI Prototyping|ux|mob|90|7–10
Product Design|ux|saas|200|21–30
Product Discovery & Strategy|ux|saas|100|10–14
Ongoing Product Design Support|ux|saas|120|Monthly
Brand Identity|brand|brand|85|14–21
Branding Package|brand|brand|140|21–30
Logo Design|logo|brand|35|5–7
Logo Redesign|logo|brand|30|4–6
Wordmark Logo|logo|brand|30|4–6
Mascot Logo|logo|brand|45|7–10
Typography Design|brand|brand|40|5–7
Illustration|ill|brand|40|5–10
Character Design|ill|brand|55|7–14
Isometric Illustration|ill|brand|60|7–14
Vector Illustration|ill|brand|35|4–7
Pitch Deck Design|brand|brand|60|5–7
Animated Explainer Video|brand|brand|90|10–14
SaaS Animation|brand|brand|110|10–14
Creative Design Sprint|brand|brand|150|5–7`.split("\n").map(r=>{const[t,c,d,p,dl]=r.split("|");
  const s={t,c,d,p:p*1000,dl:dl=="Monthly"?"Monthly retainer":dl+" business days",slug:t.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),on:true,del:false};
  s.g=/\bAI\b/.test(t)?"ai":/Fintech/.test(t)?"fin":d=="hlth"?"hlth":d=="edu"?"edu":d=="log"?"log":c=="ent"?"ent":c=="eco"||c=="shp"?"eco":c=="mob"?"mob":c=="brand"||c=="logo"?"brand":c=="ill"?"ill":c=="ux"?"ux":c=="saas"||c=="app"||c=="dash"?"saas":"web";
  s.m=c=="ill"?"ill":d; return s});
const FAQ=[["How long does a project take?","Timelines are shown on every service. Fast-track delivery is available on request."],["Can I change the demo to match my brand?","Yes. Demos are illustrative, and final projects are customized to your requirements."],["How does payment work?","Milestone-based invoices via bank transfer, JazzCash or card. Details are confirmed in your proposal."],["Do you provide support after launch?","Every project includes a post-launch support window. Ongoing plans are available."]];
const DEMOS=[["Corporate Website","corporate-website"],["SaaS Dashboard","saas-dashboard-design"],["Enterprise CRM","enterprise-web-application"],["Ecommerce Store","ecommerce-website"],["Mobile App","mobile-app-development"],["AI Workspace","ai-dashboard-design"],["Fintech Dashboard","fintech-dashboard"],["Healthcare Portal","healthcare-dashboard"],["Education Platform","school-and-college-web-application"],["Logistics Tracking","supply-chain-and-logistics-website"],["Brand Identity","brand-identity"],["Illustration Gallery","illustration"]];
const INDS=[["Fintech","fin","card","Dashboards, wallets and finance sites"],["Healthcare","hlth","pulse","Patient portals and clinic systems"],["Education","edu","cap","School, college and course platforms"],["Real Estate","web","building","Listing sites and lead portals"],["Hospitality","mob","spark","Booking sites and guest apps"],["Retail","eco","bag","Online stores and catalogues"],["Logistics","log","truck","Tracking and fleet operations"],["Professional Services","brand","pen","Authority sites and identity"],["Enterprise","ent","shield","CRM and internal platforms"],["Technology","saas","code","SaaS products and dashboards"]];
const ADD=[["Ecommerce module","Catalogue, cart and checkout",125000,"bag"],["Admin dashboard","Manage content, users and orders",100000,"grid"],["Custom API","Connect the tools you already use",80000,"code"],["Mobile responsive","Included in every build",0,"phone"],["SEO foundation","Included in every build",0,"search"]];
const PKG=[["Starter","Core build, 2 revision rounds",1],["Professional","Integrations, 4 rounds, priority",1.8],["Enterprise","Full platform, SLA support",3]];
const TL=[["Standard","The timeline shown on the service",1],["Fast-track","Priority delivery, +20%",1.2],["Flexible","No fixed deadline, 5% off",.95]];

/* ================= helpers ================= */
let ST={};try{ST=JSON.parse(localStorage.getItem("pb_svc")||"{}")}catch(e){}
const sv=()=>R.map(s=>Object.assign(s,ST[s.slug]||{})).filter(s=>!s.del);
const live=()=>sv().filter(s=>s.on);
const save=()=>{try{localStorage.setItem("pb_svc",JSON.stringify(ST))}catch(e){}};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const pkr=n=>"PKR "+Math.round(n).toLocaleString("en-US");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const gv=g=>`--c1:${GR[g][1]};--c2:${GR[g][2]}`;
const calm=matchMedia("(prefers-reduced-motion:reduce)").matches,fine=matchMedia("(hover:hover) and (pointer:fine)").matches;
const IC={arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',layers:'<path d="M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5"/>',phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',spark:'<path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9L11 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',bag:'<path d="M5 8h14l-1 12.5H6L5 8zM9 8V6.5a3 3 0 016 0V8"/>',card:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',pulse:'<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',cap:'<path d="M2 9l10-5 10 5-10 5L2 9zM6 11.5V16c1.5 1.7 3.7 2.5 6 2.5s4.5-.8 6-2.5v-4.5M22 9v6"/>',truck:'<path d="M2.5 6h11v10h-11zM13.5 9.5h4l3.5 3.5v3h-7.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',pen:'<path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 013 3L8 18.5 4 20zM14.5 6l3 3"/>',building:'<path d="M4 21V4.5h10V21M14 9.5h6V21M2.5 21h19M7.5 8.5h3M7.5 12.5h3M7.5 16.5h3M17 13.5h.01M17 17h.01"/>',frame:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8.5 9v11"/>',image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5-8.5 9"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',chat:'<path d="M4 5.5h16v11H10l-4.5 3.5v-3.5H4z"/>',monitor:'<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',laptop:'<path d="M5 5.5h14v10H5zM2.5 19h19"/>',tablet:'<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M11 18h2"/>',expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',shield:'<path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3zM9 12l2.2 2.2L15.5 10"/>',zap:'<path d="M13 3L5 13.5h6L10.5 21 19 10h-6V3z"/>',code:'<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14"/>',support:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>',grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',chev:'<path d="M6 9l6 6 6-6"/>',play:'<path d="M8 5.5v13l10.5-6.5L8 5.5z"/>'};
const ic=(n,c="")=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

/* ================= mock previews ================= */
const DK={saas:["MRR","$48.2k","Customers","3,120","Churn","2.1%"],fin:["Balance","$84.2k","Income","$32.4k","Spend","$18.9k"],hlth:["Today","42","Patients","1,860","Reports","17"],edu:["Students","2,480","Attendance","94%","Courses","36"],log:["In transit","386","On time","96%","Drivers","94"]};
const win=(cls,inner,x="")=>`<div class="mk ${cls} ${x}" aria-hidden="true"><div class="mk-bar"><i></i><i></i><i></i><span></span></div>${inner}</div>`;
function mock(m,x=""){
  if(DK[m]){const k=DK[m];return win("t-"+m,`<div class="mk-body"><div class="mk-side"><b></b><i class="on"></i><i></i><i></i><i></i><i></i></div><div class="mk-main"><div class="mk-k">${[0,2,4].map(i=>`<div><small>${k[i]}</small><b>${k[i+1]}</b></div>`).join("")}</div><div class="mk-ch"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><path class="a" d="M0 30C12 26 18 14 30 18S50 30 62 16 82 8 100 6V40H0Z"/><path class="l" d="M0 30C12 26 18 14 30 18S50 30 62 16 82 8 100 6"/><path class="l2" d="M0 34C20 31 40 30 60 25S90 19 100 17"/></svg></div></div></div>`,x)}
  if(m=="ai")return win("t-ai",`<div class="mk-ai"><div class="orb"></div><div class="ai-c"><i class="me"></i><i></i><i style="width:70%"></i><u></u></div></div>`,x);
  if(m=="store")return win("",`<div class="mk-store"><div class="st-ban">New season<em>Shop now</em></div><div class="st-g">${["12,900","24,900","6,900","18,500"].map(p=>`<div><i></i><u></u><b>Rs ${p}</b></div>`).join("")}</div></div>`,x);
  if(m=="crm")return win("",`<div class="mk-crm">${[["New","#3B82F6",3],["Contacted","#22D3EE",2],["Proposal","#FF7A18",2],["Won","#10B981",1]].map(c=>`<div style="--s:${c[1]}"><h6>${c[0]}</h6>${"<i></i>".repeat(c[2])}</div>`).join("")}</div>`,x);
  if(m=="mob")return`<div class="mkp ${x}" aria-hidden="true"><div class="mkp-s"><div class="mkp-h"><small>Today</small><b>8,420 steps</b></div>${'<div class="mkp-r"><i></i><u></u></div>'.repeat(4)}<div class="mkp-t"><i class="on"></i><i></i><i></i><i></i></div></div></div>`;
  if(m=="brand")return win("",`<div class="mk-brand"><div class="br-l">M</div><div class="br-r"><b>Aa</b><div><i style="background:#0b1220"></i><i style="background:var(--c1)"></i><i style="background:var(--c2)"></i><i style="background:#F4F7FB;box-shadow:inset 0 0 0 1px #0001"></i></div><u></u><u style="width:70%"></u></div></div>`,x);
  if(m=="ill")return win("",`<div class="mk-ill"><i></i><i></i><i></i><i></i><i></i></div>`,x);
  return win("",`<div class="mk-site"><div class="ms-nav"><b></b><i></i><i></i><i></i><u></u></div><div class="ms-hero"><div><h6>Built to<br>convert.</h6><p></p><p style="width:60%"></p><span></span></div><div class="ms-img"></div></div><div class="ms-row"><i></i><i></i><i></i></div></div>`,x)}

/* ================= components ================= */
const card=(s,i=0)=>`<article class="svc glow" style="${gv(s.g)};--i:${i%6}" data-rv><a class="pv" href="#/demo/${s.slug}" aria-label="Preview the ${esc(s.t)} demo"><span class="badge">${GR[s.g][0]}</span>${mock(s.m)}</a><div class="svc-b"><h3><a href="#/services/${s.slug}">${esc(s.t)}</a></h3><p>${dsc(s)}</p><div class="svc-m"><div><small>Starting from</small><b>${pkr(s.p)}</b></div><span>${ic("clock")}${s.dl.replace(" business days"," days")}</span></div><div class="tags">${FEAT[s.c].slice(0,3).map(f=>`<span>${f}</span>`).join("")}</div><div class="svc-a"><a class="btn btn-p sm" href="#/demo/${s.slug}">Preview demo</a><a class="btn btn-g sm" href="#/services/${s.slug}">View service</a></div></div></article>`;
const catCard=(g,i)=>{const n=live().filter(s=>s.g==g).length;const m={web:"site",saas:"saas",mob:"mob",ai:"ai",eco:"store",fin:"fin",hlth:"hlth",edu:"edu",log:"log",brand:"brand",ent:"crm",ux:"site",ill:"ill"}[g];
  return`<a class="cat glow" href="#/services?g=${g}" style="${gv(g)};--i:${i%4}" data-rv>${mock(m,"cat-g")}<span class="cat-i">${ic(GR[g][3])}</span><h3>${GR[g][0]}</h3><p>${GR[g][4]}</p><div class="cat-f"><span>${n} service${n==1?"":"s"}</span><i>${ic("arrow")}</i></div></a>`};
const stageHTML=(p,url)=>`<div class="stage" id="${p}stg"><div class="frame browser" id="${p}frm"><div class="chrome"><i></i><i></i><i></i><span id="${p}url">${url}</span></div><div class="view" id="${p}vw"><iframe id="${p}fr" title="Interactive demo" loading="lazy"></iframe></div></div><button class="btn btn-w sm fs-x" data-fs>${ic("x")}Exit fullscreen</button></div>`;

/* ================= pages ================= */
function home(){const L=live(),pick=n=>L.find(s=>s.slug==n);
const cheapest=Math.min(...L.map(s=>s.p)),pro=(pick("corporate-website")||{p:225000}).p;
const HT=[["Website","corporate-website"],["SaaS","saas-dashboard-design"],["Mobile App","mobile-app-development"],["Ecommerce","ecommerce-website"],["CRM","enterprise-web-application"],["AI","ai-dashboard-design"],["Fintech","fintech-dashboard"]].filter(x=>sv().find(s=>s.slug==x[1]));
const FP=[["AI Support Platform","ai-dashboard-design"],["Fintech Dashboard","fintech-dashboard"],["Luxury Ecommerce","ecommerce-website"],["Healthcare Portal","healthcare-dashboard"],["Enterprise CRM","enterprise-web-application"],["Education Platform","school-and-college-web-application"]].map(x=>[x[0],sv().find(s=>s.slug==x[1])]).filter(x=>x[1]);
const STEPS=[["Discover","We map your goals, users and constraints before anything gets drawn."],["Design","Wireframes become a clickable prototype you can test."],["Build","Engineers ship in weekly milestones you can review."],["Test","Every screen is checked for devices, speed and security."],["Launch","We deploy, hand over and train your team."],["Scale","Support plans keep the product improving after day one."]];
return`
<section class="hero ink" style="--c1:#3B82F6;--c2:#22D3EE"><div class="wrap">
 <div>
  <span class="pill" data-rv><i></i>Web • Mobile • SaaS • AI</span>
  <h1 class="h-xl" data-rv style="--i:1">Build digital <span class="gt">experiences</span> people remember.</h1>
  <p class="lead" data-rv style="--i:2">Premium websites, apps, SaaS platforms, ecommerce systems and enterprise software — designed to perform and built to scale.</p>
  <div class="cta" data-rv style="--i:3"><a class="btn btn-p" data-mag href="#/services">Explore solutions ${ic("arrow")}</a><a class="btn btn-g" href="#/demos">${ic("play")}View live demos</a></div>
 </div>
 <div class="hv" id="hv" aria-hidden="true" style="--c1:#7C3AED;--c2:#3B82F6">
  <div class="hv-glow"></div>
  <div class="hv-l hv-dash" data-d="10">${mock("saas")}</div>
  <div class="hv-l hv-prod" data-d="26" style="--dl:-2s"><div class="fc fc-prod"><div class="ph"><i></i></div><b>Studio Speaker</b><small>Rs 24,900 · In stock</small></div></div>
  <div class="hv-l hv-phone" data-d="34" style="--dl:-4s;--c1:#EC4899;--c2:#A855F7">${mock("mob")}</div>
  <div class="hv-l hv-kpi" data-d="42" style="--dl:-1s"><div class="fc fc-kpi"><small>Conversion rate</small><b>4.8%</b><svg viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0 24C14 22 20 10 34 14S56 26 68 12 88 4 100 3" fill="none" stroke="#22D3EE" stroke-width="2.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div></div>
  <div class="hv-l hv-prof" data-d="50" style="--dl:-6s"><div class="fc fc-prof"><i>AK</i><div><b style="font-size:14px">Ayesha Khan</b><small>New customer</small></div><em>+ Rs 48k</em></div></div>
  <div class="hv-l hv-badge" data-d="20" style="--dl:-3s"><div class="fc fc-badge"><b>150+</b>Digital experiences</div></div>
 </div>
</div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
 <div class="trust">${[["code","Custom development"],["phone","Responsive design"],["shield","Secure architecture"],["zap","Scalable systems"],["support","Dedicated support"]].map(x=>`<span>${ic(x[0])}${x[1]}</span>`).join("")}</div>
 <div class="stats">${[[Object.keys(GR).length,"","Solution categories"],[L.length,"","Service options"],[DEMOS.length,"","Interactive demo experiences"],[100,"%","Customizable"]].map((x,i)=>`<div class="stat" data-rv style="--i:${i}"><b data-count="${x[0]}" data-suf="${x[1]}">${x[0]}${x[1]}</b><span>${x[2]}</span></div>`).join("")}</div>
</div></section>

<section class="sec" id="solutions" style="padding-top:20px"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>Your idea. <span class="gt">Engineered</span> for growth.</h2><p class="lead" data-rv style="--i:1">Pick the kind of product you need. Every category opens priced services, each with a demo you can click through first.</p></div><a class="lnk" href="#/services">All ${L.length} services ${ic("arrow")}</a></div>
 <div class="cats">${["web","saas","mob","ai","eco","fin","hlth","edu","log","brand","ent","ux"].map(catCard).join("")}</div>
</div></section>

<section class="sec paper" id="process"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>From idea to launch.</h2><p class="lead" data-rv style="--i:1">Six stages, one accountable team. You see working software at every step, not just at the end.</p></div></div>
 <div class="proc" id="proc"><div class="proc-l"></div>${STEPS.map((s,i)=>`<div class="step" data-rv style="--i:${i}"><b>0${i+1}</b><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join("")}</div>
</div></section>

<section class="sec grad" id="live" style="margin-top:28px;--c1:#3B82F6;--c2:#22D3EE"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv style="max-width:none">Don’t just imagine it.<br>Try it.</h2><p class="lead" data-rv style="--i:1">Explore interactive examples of the digital products PlayBeat Digital can build for your business.</p></div></div>
 <div class="tabs" role="tablist" id="htabs" aria-label="Demo category"><span class="tabs-i"></span>${HT.map((t,i)=>`<button role="tab" aria-selected="${!i}" data-ht="${t[1]}">${t[0]}</button>`).join("")}</div>
 ${stageHTML("h","")}
 <div class="dbar"><span class="mu" id="hcap"></span><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-w sm" id="hopen" href="#/demos">Open full demo ${ic("arrow")}</a><a class="btn btn-g sm" href="#/demos">See all ${DEMOS.length} demos</a></div></div>
</div></section>

<section class="sec" id="work"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>See it. Test it. <span class="gt en">Then build it.</span></h2><p class="lead" data-rv style="--i:1">Six demo concepts you can open right now. Each one is a starting point we tailor to your brand and data.</p></div></div>
 <div class="projs">${FP.map((x,i)=>`<article class="proj glow" style="${gv(x[1].g)};--i:${i%3}" data-rv><div class="pv">${mock(x[1].m)}<div class="proj-o"><a class="btn btn-w sm" href="#/demo/${x[1].slug}">View demo</a><a class="btn btn-g sm ink" href="#/services/${x[1].slug}">Explore solution</a></div></div><div class="proj-b"><div><h3>${x[0]}</h3><span>${GR[x[1].g][0]} demo concept</span></div></div></article>`).join("")}</div>
</div></section>

<section class="sec" id="industries" style="padding-top:0"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>We build systems, not just screens.</h2><p class="lead" data-rv style="--i:1">Ten industries we design and engineer for. Choose yours to see the services that fit.</p></div></div>
 <div class="inds">${INDS.map((x,i)=>`<a class="ind" href="#/services?g=${x[1]}" style="${gv(x[1])};--i:${i%5}" data-rv>${ic(x[2])}<div><b>${x[0]}</b><span>${x[3]}</span></div></a>`).join("")}</div>
</div></section>

<section class="sec paper" id="pricing"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>Design that gets attention. Technology that gets results.</h2><p class="lead" data-rv style="--i:1">Three ways to engage. Every service lists its own starting price, and the project builder gives you a range before you talk to anyone.</p></div></div>
 <div class="prices">
  <div class="price" data-rv><h3>Starter</h3><div><small>Starting from</small><div class="amt">${pkr(cheapest)}</div></div><ul>${["One focused deliverable","Core build and handover","2 revision rounds","14 days of support"].map(f=>`<li>${ic("check")}${f}</li>`).join("")}</ul><a class="btn btn-g" href="#/build">Start this project</a></div>
  <div class="price pop" data-rv style="--i:1"><span class="tag">MOST POPULAR</span><h3>Professional</h3><div><small>Starting from</small><div class="amt gt">${pkr(pro)}</div></div><ul>${["Full site, store or dashboard","Integrations and admin panel","4 revision rounds","60 days of support","Priority delivery"].map(f=>`<li>${ic("check")}${f}</li>`).join("")}</ul><a class="btn btn-p" href="#/build?s=corporate-website">Start this project</a></div>
  <div class="price" data-rv style="--i:2"><h3>Enterprise</h3><div><small>Scoped with you</small><div class="amt">Custom quote</div></div><ul>${["SaaS products and enterprise platforms","Custom architecture and SSO","Revisions as agreed","SLA support"].map(f=>`<li>${ic("check")}${f}</li>`).join("")}</ul><a class="btn btn-g" href="#/build?s=enterprise-web-application">Start this project</a></div>
 </div>
</div></section>

<section class="sec"><div class="wrap">
 <p class="big" data-rv><span class="ol">We don’t just<br>design screens.</span></p>
 <p class="big" data-rv style="--i:2">We build<br><span class="gt">digital businesses.</span></p>
</div></section>

<section class="sec grad final"><div class="wrap">
 <h2 class="h-xl" data-rv>Your next digital product starts here.</h2>
 <p class="lead" data-rv style="--i:1;margin:22px auto 0">Tell us what you want to build. You get an estimated range straight away and a formal proposal after we talk.</p>
 <div class="cta" data-rv style="--i:2"><a class="btn btn-w" data-mag href="#/build">Build your project ${ic("arrow")}</a><a class="btn btn-g" data-wa="" href="#" target="_blank" rel="noopener">${ic("chat")}Talk on WhatsApp</a></div>
</div></section>`}

let grp="all",qy="";
const matches=()=>live().filter(s=>(grp=="all"||s.g==grp)&&(s.t+" "+CAT[s.c]+" "+GR[s.g][0]).toLowerCase().includes(qy));
const gridHTML=()=>matches().map(card).join("")||`<div class="empty"><b>No services match “${esc(qy)}”.</b><br>Clear the search or choose another category.</div>`;
function list(){const L=live(),n=matches().length;
return`<div class="page"><div class="wrap">
 <h1 class="h-lg" style="max-width:none">${grp=="all"?`Services built to <span class="gt">ship.</span>`:`<span class="gt" style="background-image:linear-gradient(110deg,${GR[grp][1]},${GR[grp][2]})">${GR[grp][0]}</span> services`}</h1>
 <p class="lead" style="margin:16px 0 30px">${grp=="all"?"Every service has a starting price, a delivery estimate and a demo you can try before you order.":GR[grp][4]}</p>
 <div class="chips" role="group" aria-label="Filter by category"><button class="chip ${grp=="all"?"on":""}" data-grp="all" style="--c1:#3B82F6;--c2:#7C3AED">All <small>${L.length}</small></button>${Object.keys(GR).map(g=>`<button class="chip ${grp==g?"on":""}" data-grp="${g}" style="${gv(g)}">${ic(GR[g][3])}${GR[g][0]} <small>${L.filter(s=>s.g==g).length}</small></button>`).join("")}</div>
 <div class="tools"><label class="field">${ic("search")}<span class="sr">Search services</span><input id="qs" type="search" placeholder="Search services" value="${esc(qy)}"></label><span class="mu" id="cnt" aria-live="polite">${n} service${n==1?"":"s"}</span></div>
 <div class="grid" id="gr">${gridHTML()}</div>
</div></div>`}

function detail(slug){const s=sv().find(x=>x.slug==slug);if(!s)return nf();const F=FEAT[s.c];
document.title=s.t+" — PlayBeat Digital";
const rel=live().filter(x=>x.g==s.g&&x!=s).slice(0,3),P=[["Starter",pkr(s.p),"Core build","2 rounds","14 days",1],["Professional",pkr(s.p*1.8),"Core build plus integrations","4 rounds","60 days",1.8],["Enterprise","Custom quote","Full platform","As agreed","SLA",3]];
return`<section class="hero ink slim d-hero" style="${gv(s.g)}"><div class="wrap">
 <div><a class="pill" href="#/services?g=${s.g}"><i></i>${GR[s.g][0]}</a>
  <h1 class="h-xl">${esc(s.t)}</h1>
  <p class="lead">${dsc(s)}</p>
  <div class="facts"><div><small>Starting from</small><b>${pkr(s.p)}</b></div><div><small>Delivery</small><b>${s.dl}</b></div><div><small>Built with</small><b>${TECH[s.c]}</b></div></div>
  <div class="cta"><a class="btn btn-p" href="#/demo/${s.slug}">${ic("play")}Preview demo</a><a class="btn btn-g" href="#/build?s=${s.slug}">Request a quote</a><a class="btn btn-g" data-wa="${esc(s.t)}" href="#" target="_blank" rel="noopener">${ic("chat")}WhatsApp us</a></div>
 </div>
 <div class="d-vis" aria-hidden="true">${mock(s.m)}</div>
</div></section>
<section class="sec" style="${gv(s.g)};padding-bottom:0"><div class="wrap"><div class="cols">
 <div class="box" data-rv><h3>What you get</h3><p>Strategy, design and delivery handled by one accountable studio. Preview the experience first, then pick the package that fits.</p><h3>Who it’s for</h3><p>Businesses, startups and teams who need a result that earns trust and performs from launch day.</p></div>
 <div class="box" data-rv style="--i:1"><h3>Features</h3><ul class="ticks">${F.map(f=>`<li>${ic("check")}${f}</li>`).join("")}</ul></div>
 <div class="box" data-rv style="--i:2"><h3>Deliverables</h3><ul class="ticks">${["Source files and documentation","Responsive, tested build","Handover session"].map(f=>`<li>${ic("check")}${f}</li>`).join("")}</ul></div>
</div></div></section>
<section class="sec grad" style="${gv(s.g)};margin-top:clamp(56px,8vw,100px)"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg">See it. Test it.</h2><p class="lead">This is a working example, not a screenshot. Click around, then open it full size.</p></div><a class="btn btn-w" href="#/demo/${s.slug}">Open full demo ${ic("arrow")}</a></div>
 ${stageHTML("d","demo.playbeat.digital/"+s.slug)}
</div></section>
<section class="sec paper" style="margin-top:28px"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg">Packages</h2><p class="lead">Three scopes for ${esc(s.t)}. Choose one to carry it into the project builder.</p></div></div>
 <div class="prices">${P.map((p,i)=>`<div class="price ${i==1?"pop":""}" data-rv style="--i:${i}">${i==1?'<span class="tag">MOST POPULAR</span>':""}<h3>${p[0]}</h3><div><small>${i<2?"Starting from":"Scoped with you"}</small><div class="amt ${i==1?"gt":""}">${p[1]}</div></div><ul><li>${ic("check")}${p[2]}</li><li>${ic("check")}Revisions: ${p[3]}</li><li>${ic("check")}Support: ${p[4]}</li>${i?`<li>${ic("check")}Priority delivery</li>`:""}</ul><a class="btn ${i==1?"btn-p":"btn-g"}" href="#/build?s=${s.slug}&p=${p[5]}">Start this project</a></div>`).join("")}</div>
</div></section>
<section class="sec"><div class="wrap" style="max-width:860px">
 <h2 class="h-lg" style="margin-bottom:24px">Questions</h2>${FAQ.map(f=>`<details class="faq"><summary>${f[0]}${ic("chev")}</summary><p>${f[1]}</p></details>`).join("")}
</div></section>
${rel.length?`<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec-h"><h2 class="h-md">More in ${GR[s.g][0]}</h2><a class="lnk" href="#/services?g=${s.g}">View all ${ic("arrow")}</a></div><div class="grid">${rel.map(card).join("")}</div></div></section>`:""}
<div class="mbar ink"><a class="btn btn-p" href="#/demo/${s.slug}">Preview demo</a><a class="btn btn-g" href="#/build?s=${s.slug}">Request quote</a></div>`}

const DEV={Desktop:[1440,860,"monitor"],Laptop:[1280,780,"laptop"],Tablet:[820,1060,"tablet"],Mobile:[390,800,"phone"]};let dev="Desktop",fs=false;
function demo(slug){const s=sv().find(x=>x.slug==slug);if(!s)return nf();document.title=s.t+" demo — PlayBeat Digital";
return`<div class="page" style="${gv(s.g)}"><div class="wrap">
 <a class="lnk" href="#/services/${s.slug}" style="margin-bottom:18px">${GR[s.g][0]} / ${esc(s.t)}</a>
 <h1 class="h-md" style="margin-top:14px">${esc(s.t)} <span class="gt" style="background-image:linear-gradient(110deg,${GR[s.g][1]},${GR[s.g][2]})">live demo</span></h1>
 <div class="dbar"><div class="tabs" id="dtabs" role="group" aria-label="Device size"><span class="tabs-i"></span>${Object.entries(DEV).map(([k,v])=>`<button data-dev="${k}" class="${k==dev?"on":""}" aria-pressed="${k==dev}">${ic(v[2])}${k}</button>`).join("")}<button data-fs>${ic("expand")}Fullscreen</button></div>
 <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-p sm" href="#/build?s=${s.slug}">Request a quote</a><a class="btn btn-g sm" href="#/services/${s.slug}">View service</a></div></div>
 ${stageHTML("p","demo.playbeat.digital/"+s.slug)}
 <p class="mu" style="font-size:13.5px;margin:56px 0 0;max-width:80ch">Demo interfaces are illustrative examples created by PlayBeat Digital to demonstrate design and development capabilities. Final client projects are customized to their requirements.</p>
</div></div>
<div class="mbar ink"><a class="btn btn-p" href="#/build?s=${s.slug}">Request quote</a><a class="btn btn-g" href="#/services/${s.slug}">View service</a></div>`}

function gallery(){return`<div class="page"><div class="wrap">
 <h1 class="h-lg" style="max-width:none">See it. Test it. <span class="gt en">Then build it.</span></h1>
 <p class="lead" style="margin:16px 0 40px">${DEMOS.length} working examples across websites, SaaS, ecommerce, dashboards, mobile and brand. Open any of them and click around.</p>
 <div class="projs">${DEMOS.map((g,i)=>{const s=sv().find(x=>x.slug==g[1]);return s?`<article class="proj glow" style="${gv(s.g)};--i:${i%3}" data-rv><div class="pv">${mock(s.m)}<div class="proj-o"><a class="btn btn-w sm" href="#/demo/${s.slug}">View demo</a><a class="btn btn-g sm ink" href="#/services/${s.slug}">Explore solution</a></div></div><div class="proj-b"><div><h3>${g[0]}</h3><span>${s.m=="mob"?"Mobile":"Web"} · ${TECH[s.c]}</span></div></div></article>`:""}).join("")}</div>
</div></div>`}

let B={g:"web",s:"",p:1,t:1};
const pick=(name,val,on,inner,style="",type="radio",x="")=>`<label class="pick" style="${style}"><input type="${type}" name="${name}" value="${val}" ${on?"checked":""} ${x}><div>${inner}</div>${ic("check","ck")}</label>`;
const svcPicks=()=>live().filter(s=>s.g==B.g).map(s=>pick("bs",s.slug,s.slug==B.s,`<b>${esc(s.t)}</b><small>From ${pkr(s.p)} · ${s.dl.replace(" business days"," days")}</small>`,gv(s.g))).join("");
function build(q){const L=live(),pre=L.find(s=>s.slug==q.get("s"))||L.find(s=>s.slug==B.s)||L.find(s=>s.slug=="corporate-website")||L[0];
B.g=pre.g;B.s=pre.slug;if(q.get("p"))B.p=+q.get("p");
return`<div class="page"><div class="wrap">
 <h1 class="h-lg" style="max-width:none">Build your <span class="gt">project.</span></h1>
 <p class="lead" style="margin:16px 0 44px">Choose what you need and watch the estimate update. Nothing is sent until you request a proposal.</p>
 <div class="est"><form id="pf" novalidate>
  <fieldset><legend><span>1</span>What are you building?</legend><div class="picks">${Object.keys(GR).filter(g=>L.some(s=>s.g==g)).map(g=>pick("bg",g,g==B.g,`<span class="pi">${ic(GR[g][3])}</span><b>${GR[g][0]}</b>`,gv(g))).join("")}</div></fieldset>
  <fieldset><legend><span>2</span>Which service?</legend><div class="picks w" id="bsv">${svcPicks()}</div></fieldset>
  <fieldset><legend><span>3</span>Package</legend><div class="picks w">${PKG.map(p=>pick("bp",p[2],p[2]==B.p,`<b>${p[0]}</b><small>${p[1]}</small>`)).join("")}</div></fieldset>
  <fieldset><legend><span>4</span>Add-ons</legend><div class="picks w">${ADD.map(a=>pick("ba",a[2],!a[2],`<span class="pi">${ic(a[3])}</span><b>${a[0]}</b><small>${a[1]}${a[2]?" · + "+pkr(a[2]):""}</small>`,"","checkbox",a[2]?"":"disabled")).join("")}</div></fieldset>
  <fieldset><legend><span>5</span>Timeline</legend><div class="picks w">${TL.map(t=>pick("bt",t[2],t[2]==B.t,`<b>${t[0]}</b><small>${t[1]}</small>`)).join("")}</div></fieldset>
  <fieldset id="contact"><legend><span>6</span>Where should we send the proposal?</legend><div class="fm">
   <label>Full name<input class="inp" name="n" autocomplete="name"></label><label>Company<input class="inp" name="c" autocomplete="organization"></label>
   <label>Email<input class="inp" name="e" type="email" autocomplete="email"></label><label>WhatsApp number<input class="inp" name="w" type="tel" autocomplete="tel"></label>
   <label class="full">Project description<textarea class="inp" name="d" rows="4"></textarea></label>
   <div class="full err" id="er" role="alert"></div>
   <button class="btn btn-p full" type="submit">Request project proposal ${ic("arrow")}</button>
   <div class="full" id="ok" aria-live="polite"></div></div></fieldset>
 </form>
 <aside class="sum" id="sum"><button type="button" class="sum-x" id="sumx" aria-expanded="false">Details ${ic("chev")}</button><small>Estimated project range</small><div class="rng" id="es"></div><dl id="bd"></dl><a class="btn btn-w" href="#contact" id="toform">Request proposal</a><a class="btn btn-g" id="eq" href="#" target="_blank" rel="noopener">${ic("chat")}Ask on WhatsApp</a><p>Indicative only. A formal quote follows your proposal request.</p></aside>
 </div></div></div>`}
function est(){const f=$("#pf");if(!f)return;const s=sv().find(x=>x.slug==B.s);B.p=+f.elements.bp.value;B.t=+f.elements.bt.value;
const adds=$$("[name=ba]:checked",f).filter(c=>+c.value),a=adds.reduce((x,c)=>x+ +c.value,0),t=(s.p*B.p+a)*B.t;
$("#es").textContent=pkr(t*.95)+" – "+pkr(t*1.15);
$("#bd").innerHTML=[["Service",s.t],["Package",PKG.find(p=>p[2]==B.p)[0]],["Add-ons",adds.length?adds.length+" selected · "+pkr(a):"Included only"],["Timeline",TL.find(x=>x[2]==B.t)[0]],["Delivery",s.dl]].map(r=>`<div><dt>${r[0]}</dt><dd>${esc(r[1])}</dd></div>`).join("");
$("#eq").dataset.wa=s.t;wa()}

function admin(){const REQ=(()=>{try{return JSON.parse(localStorage.getItem("pb_req")||"[]")}catch(e){return[]}})();
return`<div class="page"><div class="wrap">
 <h1 class="h-md">Admin: services</h1><p class="lead" style="margin:10px 0 26px">Edit prices, publish or unpublish, or remove a service. Changes save in this browser only; connect your API or database for production.</p>
 <div class="tbl"><table><tr><th>Service</th><th>Category</th><th>Starting price (PKR)</th><th>Published</th><th></th></tr>${sv().map(s=>`<tr><td>${esc(s.t)}</td><td>${CAT[s.c]}</td><td><input class="inp" style="min-height:40px;width:140px" type="number" min="0" step="1000" value="${s.p}" data-p="${s.slug}" aria-label="Price for ${esc(s.t)}"></td><td><input type="checkbox" ${s.on?"checked":""} data-on="${s.slug}" aria-label="Publish ${esc(s.t)}" style="width:20px;height:20px"></td><td><button class="btn btn-g sm" data-del="${s.slug}">Delete</button></td></tr>`).join("")}</table></div>
 <h2 class="h-md" style="margin:56px 0 18px">Project requests (${REQ.length})</h2>${REQ.map(r=>`<details class="faq"><summary>${esc(r.n)} · ${esc(r.c||"No company")} · ${esc(r.s)}${ic("chev")}</summary><p>${esc(r.e)} · ${esc(r.w||"")} · ${esc(r.est)}<br>${esc(r.d||"")}</p></details>`).join("")||'<div class="empty">No requests yet. Proposals submitted from the project builder on this browser appear here.</div>'}
</div></div>`}

function company(){const L=live();document.title="Company — PlayBeat Digital";
const PR=[["play","Demo before you order","Every service opens a working example. You click through it before you spend anything."],["card","Prices in the open","Each service lists a starting price and a delivery estimate, and the project builder gives a range in seconds."],["layers","One accountable team","Strategy, design and engineering sit in one studio, so nothing is lost between suppliers."],["support","Support after launch","Every project includes a post-launch support window, and ongoing plans are available."]];
return`<section class="hero ink slim" style="--c1:#7C3AED;--c2:#22D3EE"><div class="wrap" style="grid-template-columns:1fr"><div>
  <span class="pill"><i></i>PlayBeat Digital (Private) Limited</span>
  <h1 class="h-xl" style="max-width:15ch">We build systems, <span class="gt">not just screens.</span></h1>
  <p class="lead">PlayBeat Digital is a product studio. We design and engineer websites, apps, SaaS platforms, ecommerce and brand systems, and we show you a working demo before you commit.</p>
  <div class="cta"><a class="btn btn-p" data-mag href="#/build">Build your project ${ic("arrow")}</a><a class="btn btn-g" data-wa="" href="#" target="_blank" rel="noopener">${ic("chat")}Talk on WhatsApp</a></div>
 </div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="stats">${[[Object.keys(GR).length,"","Solution categories"],[L.length,"","Service options"],[DEMOS.length,"","Interactive demo experiences"],[100,"%","Customizable"]].map((x,i)=>`<div class="stat" data-rv style="--i:${i}"><b data-count="${x[0]}" data-suf="${x[1]}">${x[0]}${x[1]}</b><span>${x[2]}</span></div>`).join("")}</div></div></section>
<section class="sec paper"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>How we work with you.</h2><p class="lead" data-rv style="--i:1">Four commitments that hold on every project, whatever its size.</p></div><a class="lnk" href="#/process">See the six stages ${ic("arrow")}</a></div>
 <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${PR.map((p,i)=>`<div class="box" data-rv style="--i:${i};--c1:#3B82F6;--c2:#7C3AED"><span class="cat-i" style="margin-bottom:18px">${ic(p[0])}</span><h3>${p[1]}</h3><p>${p[2]}</p></div>`).join("")}</div>
</div></section>
<section class="sec"><div class="wrap">
 <div class="sec-h"><div><h2 class="h-lg" data-rv>What we build.</h2><p class="lead" data-rv style="--i:1">${Object.keys(GR).length} categories, ${L.length} priced services. Choose one to see what is included.</p></div></div>
 <div class="inds">${Object.keys(GR).map((g,i)=>{const n=L.filter(s=>s.g==g).length;return`<a class="ind" href="#/services?g=${g}" style="${gv(g)};--i:${i%5}" data-rv>${ic(GR[g][3])}<div><b>${GR[g][0]}</b><span>${n} service${n==1?"":"s"}</span></div></a>`}).join("")}</div>
</div></section>
<section class="sec grad final"><div class="wrap">
 <h2 class="h-xl" data-rv>See it. Test it. Then build it.</h2>
 <p class="lead" data-rv style="--i:1;margin:22px auto 0">Open a demo, get an estimate, or message us directly. We reply on WhatsApp.</p>
 <div class="cta" data-rv style="--i:2"><a class="btn btn-w" data-mag href="#/demos">View live demos ${ic("arrow")}</a><a class="btn btn-g" data-wa="" href="#" target="_blank" rel="noopener">${ic("chat")}+92 332 1029333</a><a class="btn btn-g" href="https://playbeat.digital" target="_blank" rel="noopener">playbeat.digital</a></div>
</div></section>`}
const nf=()=>`<div class="page"><div class="wrap"><h1 class="h-lg">That page isn’t here.</h1><p class="lead" style="margin:16px 0 26px">The service may have been renamed or unpublished.</p><a class="btn btn-p" href="#/services">Browse all services</a></div></div>`;

/* ================= demo frames ================= */
function fitFrame(p,w,h,kind){const st=$("#"+p+"stg");if(!st)return;const fr=$("#"+p+"frm"),vw=$("#"+p+"vw"),f=$("#"+p+"fr");
  if(st.classList.contains("fs")){fr.className="frame browser";fr.style.width="";f.style.cssText="width:100%;height:100%";vw.style.cssText="width:100%;height:calc(100% - 40px)";return}
  if(kind=="auto"){if(st.clientWidth<640){w=390;h=720;kind="phone"}else kind="browser"}
  const bord=kind=="tablet"?24:kind=="phone"?22:2;let sc=Math.min(1,(st.clientWidth-bord)/w);if(h*sc>840)sc=840/h;
  f.style.cssText=`width:${w}px;height:${h}px;transform:scale(${sc})`;vw.style.cssText=`width:${w*sc}px;height:${h*sc}px`;fr.style.width=w*sc+bord+"px";fr.className="frame "+kind+(fr.classList.contains("swap")?" swap":"")}
function fitAll(){fitFrame("h",1280,760,"auto");fitFrame("d",1280,760,"auto");const d=DEV[dev];fitFrame("p",d[0],d[1],dev=="Tablet"?"tablet":dev=="Mobile"?"phone":"browser");$$(".tabs").forEach(moveInd)}
function moveInd(tabs){const on=$('[aria-selected="true"],.on',tabs),i=$(".tabs-i",tabs);if(!on||!i)return;i.style.width=on.offsetWidth+"px";i.style.transform=`translateX(${on.offsetLeft}px)`}
function loadDemo(p,slug){const s=sv().find(x=>x.slug==slug),f=$("#"+p+"fr");if(!s||!f)return;f.srcdoc=tpl(s)}
function swapHome(slug){const s=sv().find(x=>x.slug==slug),fr=$("#hfrm"),sec=$("#live");if(!s||!fr)return;
  sec.style.setProperty("--c1",GR[s.g][1]);sec.style.setProperty("--c2",GR[s.g][2]);
  $("#hurl").textContent="demo.playbeat.digital/"+s.slug;$("#hcap").textContent=s.t+" · from "+pkr(s.p);$("#hopen").href="#/demo/"+s.slug;
  fr.classList.add("swap");setTimeout(()=>{const f=$("#hfr");if(!f)return;f.onload=()=>fr.classList.remove("swap");f.srcdoc=tpl(s);setTimeout(()=>fr.classList.remove("swap"),900)},calm?0:260)}

/* ================= router ================= */
function wa(){$$("[data-wa],#wa").forEach(a=>{const pp=location.pathname.split("/").filter(Boolean),n=(location.hash.match(/\/(?:services|demo)\/([^?]+)/)||[])[1]||(pp[0]=="services"&&(pp[1]=="package"||pp[1]=="demo")&&pp[2])||"",s=sv().find(x=>x.slug==n);a.href="https://wa.me/923321029333?text="+encodeURIComponent("Hello PlayBeat Digital,\nI am interested in "+(a.dataset.wa||(s?s.t:"your services"))+".\nI reviewed the demo and would like a quotation.")})}
const ANCH=["solutions","process","live","work","industries","pricing"];let io,cio,homeLazy;
function route(){const h=window.__pbsvPath||"/",[p,qs]=h.split("?"),a=p.split("/").filter(Boolean),q=new URLSearchParams(qs||"");
  if(a[0]=="contact"){return} /* in-page anchor inside the builder */
  document.title="PlayBeat Digital — Websites, apps and SaaS with live demos";fs=false;document.documentElement.style.overflow="";closeAll();
  const anchor=ANCH.includes(a[0])?a[0]:null;
  if(anchor&&$("#"+anchor)){$("#"+anchor).scrollIntoView({behavior:calm?"auto":"smooth"});setNav(anchor);return}
  if(a[0]=="services"&&!a[1]){grp=GR[q.get("g")]?q.get("g"):"all";qy=(q.get("q")||"").toLowerCase()}
  if(a[0]=="demo")dev=innerWidth<720?"Mobile":"Desktop";
  const v=a[0]=="services"?(a[1]?detail(a[1]):list()):a[0]=="demo"?demo(a[1]):a[0]=="demos"?gallery():a[0]=="build"?build(q):a[0]=="admin"?admin():a[0]=="company"?company():home();
  const app=$("#app");app.innerHTML=v;app.classList.remove("enter");void app.offsetWidth;app.classList.add("enter");
  {const pr=$(".pbsv-root");if(pr)pr.classList.toggle("has-bar",!!$(".mbar")||!!$("#sum"))}
  setNav(anchor||a[0]||"");
  if(anchor)requestAnimationFrame(()=>$("#"+anchor)&&$("#"+anchor).scrollIntoView());else{scrollTo({top:0,behavior:"instant"});requestAnimationFrame(()=>scrollTo({top:0,behavior:"instant"}))}
  if(a[0]=="demo")loadDemo("p",a[1]);
  if(a[0]=="services"&&a[1])lazy($("#dstg"),()=>loadDemo("d",a[1]));
  if($("#htabs"))lazy($("#hstg"),()=>swapHome($("#htabs [aria-selected=true]").dataset.ht));
  if($("#pf"))est();
  const oc=$(".chip.on"),cw=$(".chips");if(oc&&cw)cw.scrollLeft=oc.offsetLeft-cw.clientWidth/2+oc.offsetWidth/2;
  watch();fitAll();wa();onScroll()}
function setNav(k){$$(".nl[data-k]").forEach(l=>l.classList.toggle("on",l.dataset.k==k||(k=="demo"&&l.dataset.k=="demos")))}
function lazy(el,fn){if(!el)return;const o=new IntersectionObserver(e=>{if(e.some(x=>x.isIntersecting)){o.disconnect();fn()}},{rootMargin:"300px"});o.observe(el)}
function watch(){io&&io.disconnect();cio&&cio.disconnect();
  io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{rootMargin:"0px 0px -6% 0px"});
  $$("[data-rv]:not(.in)").forEach(e=>io.observe(e));
  cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;cio.unobserve(e.target);const el=e.target,to=+el.dataset.count,suf=el.dataset.suf||"";if(calm)return;const t0=performance.now(),d=1100;(function tick(t){const k=Math.min(1,(t-t0)/d),v=Math.round(to*(1-Math.pow(1-k,3)));el.textContent=v+suf;if(k<1)requestAnimationFrame(tick)})(t0)}),{threshold:.6});
  $$("[data-count]").forEach(e=>cio.observe(e))}
function onScroll(){$("#nav").classList.toggle("solid",scrollY>24);const pr=$("#proc");if(pr){const r=pr.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.78-r.top)/(innerHeight*.5)));pr.style.setProperty("--p",p);$$(".step",pr).forEach((s,i)=>s.classList.toggle("on",p>i/6+.02))}}

/* ================= nav, mega menu, palette ================= */
const MEGA=[["Build",[["Websites","?g=web","globe"],["Web Apps","?q=web application","frame"],["Mobile Apps","?g=mob","phone"],["SaaS","?g=saas","layers"]]],["Commerce",[["Ecommerce","?g=eco","bag"],["Shopify","?q=shopify","bag"],["Digital Stores","/ecommerce-website","card"]]],["Design",[["UI/UX","?g=ux","frame"],["Branding","?g=brand","pen"],["Logo","?q=logo","spark"],["Illustration","?g=ill","image"]]],["Business",[["CRM","/enterprise-web-application","building"],["Dashboards","?q=dashboard","grid"],["Enterprise","?g=ent","shield"],["Automation","/enterprise-web-application","zap"]]]];
function closeAll(){$("#mega").classList.remove("open");$("#nsv").setAttribute("aria-expanded","false");$("#sheet").classList.remove("open");closeCmd()}
let ci=0,cItems=[];
function cmdData(){return[...live().map(s=>({t:s.t,k:"Services",sub:GR[s.g][0]+" · from "+pkr(s.p),h:"#/services/"+s.slug,g:s.g,ic:GR[s.g][3]})),...DEMOS.map(d=>{const s=sv().find(x=>x.slug==d[1]);return s&&{t:d[0]+" demo",k:"Demos",sub:"Interactive demo",h:"#/demo/"+s.slug,g:s.g,ic:"play"}}).filter(Boolean),...INDS.map(x=>({t:x[0],k:"Industries",sub:x[3],h:"#/services?g="+x[1],g:x[1],ic:x[2]}))]}
function cmdRender(){const q=$("#cq").value.trim().toLowerCase(),all=cmdData().filter(x=>!q||(x.t+" "+x.sub+" "+x.k).toLowerCase().includes(q));
  cItems=[];let h="";["Services","Demos","Industries"].forEach(k=>{const r=all.filter(x=>x.k==k).slice(0,q?8:4);if(!r.length)return;h+=`<h5>${k}</h5>`+r.map(x=>{cItems.push(x);return`<a href="${x.h}" data-ci="${cItems.length-1}" style="${gv(x.g)}"><i>${ic(x.ic)}</i>${esc(x.t)}<small>${esc(x.sub)}</small>${ic("arrow")}</a>`}).join("")});
  $("#cr").innerHTML=h||`<p>Nothing matches “${esc(q)}”. Try “dashboard”, “logo” or “store”.</p>`;ci=0;cmdSel()}
function cmdSel(){$$("#cr a").forEach((a,i)=>{a.classList.toggle("sel",i==ci);if(i==ci)a.scrollIntoView({block:"nearest"})})}
function openCmd(){closeAll();$("#cmd").classList.add("open");$("#cq").value="";cmdRender();$("#cq").focus()}
function closeCmd(){$("#cmd").classList.remove("open")}

function init(){
  $("#mega").innerHTML=MEGA.map(c=>`<div><h4>${c[0].toUpperCase()}</h4>${c[1].map(m=>`<a class="mi" href="#/services${m[1]}" style="--c2:#22D3EE">${ic(m[2])}${m[0]}</a>`).join("")}</div>`).join("")+`<a class="mega-c" href="#/demos" style="--c1:#7C3AED;--c2:#3B82F6">${mock("saas")}<b>Explore live demos</b><span>${DEMOS.length} working examples ${ic("arrow")}</span></a>`;
  PBSV.on(window,"resize",fitAll);PBSV.on(window,"scroll",onScroll,{passive:true});
  PBSV.on(document,"keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=="k"){e.preventDefault();$("#cmd").classList.contains("open")?closeCmd():openCmd();return}
    if(e.key=="Escape"){if(fs)toggleFs();closeAll();return}
    if($("#cmd").classList.contains("open")){if(e.key=="ArrowDown"){e.preventDefault();ci=Math.min(cItems.length-1,ci+1);cmdSel()}if(e.key=="ArrowUp"){e.preventDefault();ci=Math.max(0,ci-1);cmdSel()}if(e.key=="Enter"&&cItems[ci]){e.preventDefault();const m=mapHash(cItems[ci].h);if(m){PBSV.go(m[0]);pbsvRoute()}closeCmd()}}});
  $("#cq").addEventListener("input",cmdRender);
  const nsv=$("#nsv"),mega=$("#mega"),nav=$("#nav");let mt;
  const openM=()=>{clearTimeout(mt);mega.classList.add("open");nsv.setAttribute("aria-expanded","true")},shutM=()=>{mt=setTimeout(()=>{mega.classList.remove("open");nsv.setAttribute("aria-expanded","false")},160)};
  nsv.addEventListener("focus",openM);mega.addEventListener("focusin",openM);nav.addEventListener("focusout",e=>{if(!nav.contains(e.relatedTarget))shutM()});
  if(fine){nsv.addEventListener("pointerenter",openM);nsv.addEventListener("pointerleave",shutM);mega.addEventListener("pointerenter",openM);mega.addEventListener("pointerleave",shutM)}
  PBSV.on(document,"click",e=>{const t=e.target.closest("button,a,[data-ci]")||e.target;
    ;
    if(!e.target.closest("#mega"))mega.classList.remove("open"),nsv.setAttribute("aria-expanded","false");
    if(t.closest&&t.closest("#mega a,#sheet a,#cr a"))closeAll();
    if(t.dataset.cmd!=null)openCmd();
    if(e.target.id=="cmd")closeCmd();
    if(t.id=="nmenu")$("#sheet").classList.add("open");
    if(t.id=="sheetx")$("#sheet").classList.remove("open");
    if(t.dataset.grp){grp=t.dataset.grp;PBSV.go("/services"+(grp=="all"?"?view=catalog":"?g="+grp),true);const x=$(".chips").scrollLeft;$("#app").innerHTML=list();$(".chips").scrollLeft=x;$(".chip.on").scrollIntoView({inline:"center",block:"nearest",behavior:calm?"auto":"smooth"});watch()}
    if(t.dataset.ht){$$("#htabs button").forEach(b=>b.setAttribute("aria-selected",b==t));moveInd($("#htabs"));swapHome(t.dataset.ht)}
    if(t.dataset.dev){dev=t.dataset.dev;$$("[data-dev]").forEach(b=>{b.classList.toggle("on",b==t);b.setAttribute("aria-pressed",b==t)});fitAll()}
    if(t.dataset.fs!=null)toggleFs();
    if(t.id=="sumx"){const o=$("#sum").classList.toggle("open");t.setAttribute("aria-expanded",o)}
    if(t.id=="toform"){e.preventDefault();$("#sum").classList.remove("open");$("#contact").scrollIntoView({behavior:calm?"auto":"smooth"});setTimeout(()=>$("#pf").elements.n.focus({preventScroll:true}),400)}
    if(t.dataset.del&&confirm("Remove this service from the catalogue in this browser?")){ST[t.dataset.del]=Object.assign(ST[t.dataset.del]||{},{del:true});save();$("#app").innerHTML=admin()}});
  PBSV.on(document,"input",e=>{const t=e.target;
    if(t.id=="qs"){qy=t.value.toLowerCase();$("#gr").innerHTML=gridHTML();const n=matches().length;$("#cnt").textContent=n+" service"+(n==1?"":"s");watch()}
    if(t.dataset.p){ST[t.dataset.p]=Object.assign(ST[t.dataset.p]||{},{p:+t.value});save()}
    if(t.dataset.on){ST[t.dataset.on]=Object.assign(ST[t.dataset.on]||{},{on:t.checked});save()}});
  PBSV.on(document,"change",e=>{const t=e.target;if(!t.closest||!t.closest("#pf"))return;
    if(t.name=="bg"){B.g=t.value;B.s=live().find(s=>s.g==B.g).slug;$("#bsv").innerHTML=svcPicks()}
    if(t.name=="bs")B.s=t.value;est()});
  PBSV.on(document,"submit",e=>{e.preventDefault();const f=e.target;if(f.id!="pf")return;const v=n=>f.elements[n].value.trim();let m="",bad="";
    if(v("n").length<2){m="Enter your full name so we know who to address the proposal to.";bad="n"}else if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("e"))){m="Enter an email address like name@company.com.";bad="e"}else if(v("w").replace(/\D/g,"").length<10){m="Enter a WhatsApp number with at least 10 digits.";bad="w"}
    $("#er").textContent=m;if(m){f.elements[bad].focus();return}
    const s=sv().find(x=>x.slug==B.s);const adds=$$("[name=ba]:checked",f).filter(c=>+c.value);
    const d0=v("d");const desc=d0.length>=20?d0:("Project builder enquiry for "+s.t+". Package: "+PKG.find(p=>p[2]==B.p)[0]+". Add-ons: "+(adds.length?adds.map(c=>ADD.find(a=>a[2]==+c.value)[0]).join(", "):"none")+". Timeline: "+TL.find(x=>x[2]==B.t)[0]+". Delivery: "+s.dl+". Estimated range: "+$("#es").textContent+".");
    $("#ok").innerHTML='<div class="ok" style="opacity:.75">Sending your request…</div>';
    PBSV.post({fullName:v("n"),businessName:v("c"),email:v("e"),phone:v("w"),service:(PBSV.svcMap&&PBSV.svcMap[s.c])||"Other",projectType:s.t,description:desc,features:adds.map(c=>ADD.find(a=>a[2]==+c.value)[0]).join(", "),budget:$("#es").textContent,timeline:s.dl,notes:"Business Solutions project builder · "+PKG.find(p=>p[2]==B.p)[0]+" · "+TL.find(x=>x[2]==B.t)[0]}).then(ok=>{
      $("#ok").innerHTML=ok?'<div class="ok">Proposal requested for '+esc(s.t)+'. Our team will contact you on WhatsApp shortly.</div>':'<div class="err">We could not send your request just now. Please try again shortly, or message us on WhatsApp.</div>'});
    });
  /* pointer effects: card spotlight, small tilt, hero parallax, magnetic buttons */
  if(fine&&!calm){let lc,lm;PBSV.on(document,"pointermove",e=>{
    const g=e.target.closest(".glow");if(g){const r=g.getBoundingClientRect();g.style.setProperty("--mx",e.clientX-r.left+"px");g.style.setProperty("--my",e.clientY-r.top+"px")}
    const c=e.target.closest(".cat");if(lc&&lc!=c){lc.style.setProperty("--rx","0deg");lc.style.setProperty("--ry","0deg")}
    if(c){const r=c.getBoundingClientRect();c.style.setProperty("--ry",((e.clientX-r.left)/r.width-.5)*4+"deg");c.style.setProperty("--rx",-((e.clientY-r.top)/r.height-.5)*4+"deg")}lc=c;
    const m=e.target.closest("[data-mag]");if(lm&&lm!=m)lm.style.transform="";
    if(m){const r=m.getBoundingClientRect();m.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.28-2}px)`}lm=m;
    const hv=$("#hv");if(hv&&scrollY<innerHeight){const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;$$(".hv-l",hv).forEach(l=>{const d=+l.dataset.d;l.style.transform=`translate3d(${-x*d}px,${-y*d}px,0)`})}},{passive:true})}
  route()}
function toggleFs(){const st=$("#pstg");if(!st)return;fs=!fs;st.classList.toggle("fs",fs);document.documentElement.style.overflow=fs?"hidden":"";fitAll()}

/* ================= interactive demo templates =================
   Each demo is {css, run, data}. run() is serialised into a sandboxed iframe (srcdoc),
   so it may only use its argument and the helpers that kit() defines there. */
const KIT_CSS=`*{box-sizing:border-box;margin:0}html{-webkit-text-size-adjust:100%}
body{font:500 14px/1.5 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg,#fff);color:var(--tx,#0B1220);-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit;color:inherit}button{cursor:pointer;border:0;background:none}
:focus-visible{outline:2px solid #22D3EE;outline-offset:2px}
.k-toasts{position:fixed;z-index:99;left:50%;bottom:20px;transform:translateX(-50%);display:grid;gap:8px;justify-items:center;pointer-events:none;width:max-content;max-width:92vw}
.k-toast{background:#0B1220;color:#fff;padding:11px 16px;border-radius:12px;font-weight:600;font-size:13.5px;box-shadow:0 16px 40px -12px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.12);display:flex;gap:9px;align-items:center;animation:kt .35s cubic-bezier(.22,.8,.26,1)}
.k-toast::before{content:"";width:8px;height:8px;border-radius:50%;background:#10B981;flex:none}
@keyframes kt{from{opacity:0;transform:translateY(12px)}}
.k-ov{position:fixed;inset:0;z-index:90;background:rgba(5,8,22,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);display:grid;place-items:center;padding:16px;opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s}
.k-ov.s{opacity:1;visibility:visible}
.k-modal{position:relative;width:min(440px,100%);max-height:90vh;overflow:auto;background:#fff;color:#0B1220;border-radius:20px;padding:24px;transform:translateY(14px) scale(.98);transition:transform .35s cubic-bezier(.22,.8,.26,1);box-shadow:0 40px 80px -30px rgba(0,0,0,.6)}
.k-ov.s .k-modal{transform:none}
#kd{place-items:stretch end;padding:0}
.k-drawer{position:relative;width:min(380px,100vw);background:#fff;color:#0B1220;padding:24px;overflow:auto;transform:translateX(100%);transition:transform .4s cubic-bezier(.22,.8,.26,1)}
.k-ov.s .k-drawer{transform:none}
.k-x{position:absolute;right:14px;top:12px;width:34px;height:34px;border-radius:10px;font-size:20px;color:#64748B;z-index:2}.k-x:hover{background:#F1F5F9}
.k-modal h3,.k-drawer h3{font-size:19px;letter-spacing:-.02em;margin-bottom:6px;padding-right:34px}
.k-modal p,.k-drawer p{color:#64748B;margin-bottom:14px}
.k-f{display:grid;gap:10px}.k-f label{font-size:12.5px;font-weight:700;color:#64748B;display:grid;gap:5px}
.k-f input,.k-f select{height:44px;border-radius:12px;border:1px solid #E2E8F0;padding:0 12px;background:#fff;color:#0B1220;width:100%}
.k-b{height:44px;padding:0 18px;border-radius:12px;background:linear-gradient(110deg,var(--a1,#3B82F6),var(--a2,#7C3AED));color:#fff;font-weight:700;transition:transform .25s,filter .25s}.k-b:hover{transform:translateY(-1px);filter:brightness(1.08)}
.k-g{height:44px;padding:0 18px;border-radius:12px;border:1px solid #E2E8F0;font-weight:700;color:#0B1220;background:#fff}
.k-e{color:#DC2626;font-size:13px;font-weight:600;min-height:1.2em}
.k-dl{display:grid;gap:0;margin:14px 0 18px}.k-dl div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #EEF2F7}.k-dl span{color:#64748B}
.ava{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;font-size:12px;font-weight:800;color:#fff;flex:none;font-style:normal}
.skb{border-radius:12px;background:linear-gradient(90deg,rgba(148,163,184,.22) 25%,rgba(148,163,184,.08) 50%,rgba(148,163,184,.22) 75%) 0 0/200% 100%;animation:sk 1s linear infinite}
@keyframes sk{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:.01ms!important}}`;

function kit(){
  const d=document,HUE=[217,262,188,24,330,158,43];
  window.$=(s,r=d)=>r.querySelector(s);window.$$=(s,r=d)=>[...r.querySelectorAll(s)];
  window.h=x=>d.body.insertAdjacentHTML("beforeend",x);
  window.fmt=(n,dec=0)=>Number(n).toLocaleString("en-US",{minimumFractionDigits:dec,maximumFractionDigits:dec});
  h('<div class="k-toasts" id="kt" aria-live="polite"></div><div class="k-ov" id="ko"><div class="k-modal" role="dialog" aria-modal="true"><button class="k-x" aria-label="Close" data-close>×</button><div id="km"></div></div></div><div class="k-ov" id="kd"><aside class="k-drawer" role="dialog" aria-modal="true"><button class="k-x" data-close aria-label="Close">×</button><div id="kdb"></div></aside></div>');
  window.toast=m=>{const t=d.createElement("div");t.className="k-toast";t.textContent=m;$("#kt").append(t);setTimeout(()=>t.remove(),2800)};
  window.modal=x=>{$("#km").innerHTML=x;$("#ko").classList.add("s");const f=$("#km input,#km button");f&&f.focus()};
  window.drawer=x=>{$("#kdb").innerHTML=x;$("#kd").classList.add("s")};
  window.shut=()=>{$("#ko").classList.remove("s");$("#kd").classList.remove("s")};
  d.addEventListener("click",e=>{if(e.target.dataset.close!=null||e.target.classList.contains("k-ov"))shut()});
  d.addEventListener("keydown",e=>{if(e.key=="Escape")shut()});
  const calm=matchMedia("(prefers-reduced-motion:reduce)").matches;
  window.count=(el,to,pre="",suf="",dec=0)=>{if(calm){el.textContent=pre+fmt(to,dec)+suf;return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/900),v=to*(1-Math.pow(1-k,3));el.textContent=pre+fmt(v,dec)+suf;if(k<1)requestAnimationFrame(f)})(t0)};
  window.spline=p=>p.map((a,i)=>{if(!i)return"M"+a[0]+" "+a[1];const b=p[i-1],m=(a[0]+b[0])/2;return"C"+m+" "+b[1]+" "+m+" "+a[1]+" "+a[0]+" "+a[1]}).join("");
  window.ava=(n,i=0,sz=34)=>'<i class="ava" style="width:'+sz+"px;height:"+sz+"px;background:linear-gradient(135deg,hsl("+HUE[i%7]+",80%,56%),hsl("+HUE[(i+2)%7]+',75%,48%))">'+n.split(" ").map(w=>w[0]).slice(0,2).join("")+"</i>";
  window.sk=(n,ht)=>Array(n).fill('<div class="skb" style="height:'+ht+'px"></div>').join("");
}
const doc=d=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"><style>${KIT_CSS}${d.css}</style></head><body><script>(${kit})();(${d.run})(${JSON.stringify(d.data||{})})<\/script></body></html>`;

/* ---------------- dashboards: SaaS, fintech, healthcare, education, logistics ---------------- */
const DARK={bg:"#061229",card:"rgba(255,255,255,.055)",tx:"#EAF4FF",mu:"#8DA2C0",ln:"rgba(255,255,255,.10)",side:"#040B1C",stx:"#EAF4FF",hov:"rgba(255,255,255,.05)"};
const DASH={
 saas:{ns:"Trial",n:"Nimbus",sp:"plans",add:"Customer",chart:"Revenue",tbl:"Customers",th:{bg:"#F4F7FB",card:"#fff",tx:"#0B1220",mu:"#64748B",ln:"#E5EAF2",side:"#0B1220",stx:"#F8FAFC",hov:"#F8FAFC",a1:"#3B82F6",a2:"#7C3AED"},
  nav:["Dashboard","Analytics","Customers","Subscriptions","Invoices","Settings"],
  k:[["Revenue",182000,"$"],["MRR",48200,"$"],["Subscriptions",1284],["Customers",3120],["Churn",2.1,"","%",1,1]],
  cols:["Customer","Plan","MRR","Status"],cur:"$",rows:[["Acme Ltd","Pro",1200,"Active"],["Zenith Labs","Starter",300,"Active"],["Orbit Co","Enterprise",4800,"Trial"],["Luma Health","Pro",1200,"Churned"],["Kite Studio","Starter",300,"Active"],["Delta Freight","Pro",1200,"Active"]]},
 fin:{ns:"Pending",n:"Vaultly",sp:"cards",add:"Transfer",chart:"Balance",tbl:"Transactions",signed:1,th:Object.assign({},DARK,{a1:"#22D3EE",a2:"#10B981"}),
  nav:["Overview","Cards","Transactions","Invoices","Analytics"],
  k:[["Total balance",84200,"$"],["Income",32400,"$"],["Expenses",18900,"$",0,0,1],["Savings rate",41,"","%"]],
  cols:["Merchant","Category","Amount","Status"],cur:"$",rows:[["Stripe payout","Income",4200,"Settled"],["AWS","Software",-890,"Settled"],["Payroll","People",-9800,"Pending"],["Figma","Software",-120,"Settled"],["Orbit Co","Income",6400,"Pending"],["Careem","Travel",-46,"Settled"]]},
 hlth:{ns:"Scheduled",n:"CareSync",sp:"patients",add:"Appointment",chart:"Patient visits",tbl:"Appointments",th:{bg:"#F0FAFB",card:"#fff",tx:"#0B2A33",mu:"#5B7A85",ln:"#DCEEF1",side:"#fff",stx:"#0B2A33",hov:"#F3FBFC",a1:"#0EA5E9",a2:"#14B8A6"},
  nav:["Dashboard","Patients","Appointments","Doctors","Reports","Billing"],
  k:[["Appointments today",42],["Active patients",1860],["Revenue",64000,"$"],["Pending reports",17,"",0,0,1]],
  cols:["Patient","Doctor","Time","Status"],rows:[["Ahmed Khan","Dr. Malik","09:00","Checked in"],["Sana Ali","Dr. Noor","09:30","Waiting"],["Rida Shah","Dr. Malik","10:00","Scheduled"],["Moiz Iqbal","Dr. Hina","10:30","Scheduled"],["Fatima Raza","Dr. Noor","11:00","Done"]]},
 edu:{ns:"Due",n:"EduCore",sp:"courses",add:"Student",chart:"Attendance",tbl:"Students",th:{bg:"#FAF8FF",card:"#fff",tx:"#1E1535",mu:"#6B6485",ln:"#ECE7FA",side:"#2E1065",stx:"#F5F3FF",hov:"#FAF8FF",a1:"#7C3AED",a2:"#3B82F6"},
  nav:["Dashboard","Students","Teachers","Attendance","Fees","Courses","Results"],
  k:[["Students",2480],["Teachers",132],["Attendance",94,"","%"],["Fees collected",9.2,"Rs ","M",1]],
  cols:["Student","Class","Attendance","Fee"],rows:[["Ayesha Tariq","10-A","96%","Paid"],["Hamza Butt","9-B","88%","Due"],["Sara Malik","10-A","99%","Paid"],["Bilal Ahmed","8-C","91%","Paid"],["Zoya Khan","9-B","85%","Due"]]},
 log:{ns:"Pending",n:"Routely",sp:"track",add:"Shipment",chart:"Deliveries",tbl:"Shipments",th:Object.assign({},DARK,{bg:"#071226",a1:"#3B82F6",a2:"#FF7A18"}),
  nav:["Shipments","Warehouses","Drivers","Orders","Tracking","Analytics"],
  k:[["In transit",386],["Delivered today",1204],["Drivers on road",94],["On time",96,"","%"]],
  cols:["Shipment","Route","Driver","Status"],rows:[["SH-1042","Lahore to Karachi","Imran Ali","In transit"],["SH-1043","Islamabad to Peshawar","Adeel Shah","Delivered"],["SH-1044","Karachi to Quetta","Waqas Khan","Delayed"],["SH-1045","Multan to Lahore","Faisal Raza","In transit"],["SH-1046","Islamabad to Lahore","Omar Butt","Pending"]]}};
const DASH_CSS=`.app{display:grid;grid-template-columns:224px minmax(0,1fr);min-height:100vh}
.sb{background:var(--side);color:var(--stx);padding:20px 14px;display:flex;flex-direction:column;gap:22px;border-right:1px solid var(--ln);position:sticky;top:0;height:100vh}
.lg{display:flex;gap:10px;align-items:center;font-weight:800;font-size:17px;letter-spacing:-.02em;padding:0 8px}.lg i{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,var(--a1),var(--a2))}
.sb nav{display:grid;gap:3px}.sb nav button{display:flex;gap:10px;align-items:center;height:40px;padding:0 10px;border-radius:11px;font-weight:600;opacity:.66;text-align:left;transition:opacity .2s,background .3s}
.sb nav button span{width:8px;height:8px;border-radius:3px;background:currentColor;opacity:.5}
.sb nav button:hover{opacity:1}.sb nav button.on{opacity:1;background:linear-gradient(110deg,var(--a1),var(--a2));color:#fff;box-shadow:0 10px 22px -10px var(--a1)}
.me{margin-top:auto;display:flex;gap:10px;align-items:center;padding:10px 8px;border-top:1px solid rgba(128,140,170,.25)}.me small{display:block;opacity:.6;font-size:12px}
main{padding:22px 26px 40px;display:grid;gap:18px;align-content:start;min-width:0}
.tb{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.tb h1{font-size:24px;letter-spacing:-.03em;margin-right:auto}
.hb{display:none;width:40px;height:40px;border-radius:11px;border:1px solid var(--ln);font-size:17px}
.dd{position:relative}.dd>button,.gh{height:40px;padding:0 14px;border-radius:11px;border:1px solid var(--ln);background:var(--card);font-weight:600}
.ddm{position:absolute;right:0;top:46px;z-index:5;min-width:170px;padding:6px;border-radius:14px;background:#fff;color:#0B1220;box-shadow:0 24px 50px -18px rgba(0,0,0,.45),0 0 0 1px rgba(8,20,38,.08);display:grid;opacity:0;visibility:hidden;transform:translateY(-6px);transition:.22s}
.dd.o .ddm{opacity:1;visibility:visible;transform:none}.ddm button{text-align:left;padding:9px 12px;border-radius:9px;font-weight:600}.ddm button:hover{background:#F1F5F9}
.pri{height:40px;padding:0 16px;border-radius:11px;background:linear-gradient(110deg,var(--a1),var(--a2));color:#fff;font-weight:700}
.ks{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px}
.cd,.kp{background:var(--card);border:1px solid var(--ln);border-radius:18px;padding:18px;min-width:0}
.kp small{color:var(--mu);font-weight:600;font-size:12.5px;display:block}
.kp b{display:block;font-size:30px;letter-spacing:-.04em;line-height:1.15;margin:4px 0 6px;font-weight:800}
.kp em{font-style:normal;font-size:12px;font-weight:700;padding:3px 8px;border-radius:99px;background:rgba(16,185,129,.14);color:#10B981}
.kp em.dw{background:rgba(245,158,11,.16);color:#F59E0B}
.r2{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px}
.ch{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}.ch b{font-size:16px;letter-spacing:-.02em}
.ch input{height:38px;border-radius:10px;border:1px solid var(--ln);background:transparent;padding:0 12px;width:min(220px,50%)}
.lgd{font-size:12px;color:var(--mu);display:flex;gap:6px;align-items:center}.lgd i{width:14px;height:3px;border-radius:3px;background:var(--a1)}.lgd i.b{background:var(--mu);margin-left:8px;opacity:.6}
.lc{position:relative;height:230px}.lc svg{display:block;overflow:visible}
.lc .ln{fill:none;stroke:url(#lg);stroke-width:2.5;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:dr 1.2s .1s cubic-bezier(.3,.7,.2,1) forwards}
@keyframes dr{to{stroke-dashoffset:0}}
.lc .pv{fill:none;stroke:var(--mu);stroke-width:1.5;stroke-dasharray:4 5;opacity:.5}
.lc .ar{fill:url(#la);opacity:0;animation:fi .8s .6s forwards}@keyframes fi{to{opacity:1}}
.lc .gd{stroke:var(--ln);stroke-width:1}
.tip{position:absolute;pointer-events:none;transform:translate(-50%,-130%);background:#0B1220;color:#fff;padding:6px 10px;border-radius:9px;font-size:12px;font-weight:700;white-space:nowrap;opacity:0;transition:opacity .15s;box-shadow:0 0 0 1px rgba(255,255,255,.14)}
.dot{position:absolute;width:12px;height:12px;margin:-6px;border-radius:50%;background:#fff;border:3px solid var(--a1);opacity:0;pointer-events:none}
.tw{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:480px}
th{font-size:12px;color:var(--mu);font-weight:700;text-align:left;padding:10px;cursor:pointer;user-select:none;white-space:nowrap}th:hover{color:var(--tx)}
td{padding:11px 10px;border-top:1px solid var(--ln);white-space:nowrap}tbody tr{cursor:pointer;transition:background .15s}tbody tr:hover{background:var(--hov)}
td:first-child{display:flex;gap:10px;align-items:center;font-weight:700}
.st{font-size:12px;font-weight:700;padding:4px 10px;border-radius:99px}.st.g{background:rgba(16,185,129,.14);color:#10B981}.st.w{background:rgba(245,158,11,.16);color:#D97706}.st.b{background:rgba(239,68,68,.14);color:#EF4444}.st.i{background:rgba(59,130,246,.14);color:#3B82F6}
.in{color:#10B981;font-weight:700}
.dn{width:150px;height:150px;border-radius:50%;margin:6px auto 14px;display:grid;place-items:center;transition:background .5s}
.dn div{width:106px;height:106px;border-radius:50%;background:var(--bg);display:grid;place-items:center;align-content:center;text-align:center}
.cd .dn div{background:#fff}.dn b{font-size:22px;letter-spacing:-.03em;line-height:1}.dn small{color:var(--mu);font-size:11px}
.l2{list-style:none;padding:0;display:grid;gap:8px}.l2 li{display:flex;gap:9px;align-items:center;color:var(--mu)}.l2 i{width:10px;height:10px;border-radius:3px}.l2 b{margin-left:auto;color:var(--tx)}
.bk{display:grid;gap:12px}
.bc{position:relative;border-radius:18px;padding:18px;min-height:128px;color:#fff;overflow:hidden;background:linear-gradient(135deg,rgba(34,211,238,.42),rgba(16,185,129,.18));border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);display:flex;flex-direction:column;justify-content:space-between;transition:transform .35s}
.bc:hover{transform:translateY(-3px) rotate(-.6deg)}
.bc::after{content:"";position:absolute;right:-30px;top:-30px;width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,.14)}
.bc.b2{background:linear-gradient(135deg,rgba(59,130,246,.4),rgba(124,58,237,.3))}
.bc small{opacity:.85;font-weight:600}.bc b{font-size:15px;letter-spacing:.14em}.bc span{font-size:24px;font-weight:800;letter-spacing:-.03em}
.pt{display:flex;gap:12px;align-items:center;padding:12px;border-radius:16px;border:1px solid var(--ln);margin-bottom:10px;background:var(--hov)}
.pt div{min-width:0;flex:1}.pt small{display:block;color:var(--mu);font-size:12px}
.pt button{height:34px;padding:0 12px;border-radius:10px;font-weight:700;font-size:12.5px;background:linear-gradient(110deg,var(--a1),var(--a2));color:#fff}
.cr{display:flex;gap:12px;align-items:center;margin-bottom:14px}.cr>i{width:44px;height:44px;border-radius:13px;flex:none}
.cr div{flex:1;min-width:0}.cr small{color:var(--mu);font-size:12px;display:block}
.pg{height:7px;border-radius:9px;background:var(--ln);margin-top:6px;overflow:hidden}.pg u{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,var(--a1),var(--a2));transition:width 1s cubic-bezier(.3,.7,.2,1)}
.wk{display:flex;gap:8px;justify-content:space-between;padding-top:12px;border-top:1px solid var(--ln)}
.wk span{display:grid;gap:5px;justify-items:center;font-size:11px;color:var(--mu);font-weight:700}.wk i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:10.5px;color:#fff;background:var(--a1)}.wk i.lo{background:#FBBF24;color:#422006}
.map{border-radius:14px;overflow:hidden;background:#0A1A36;margin-bottom:14px}.map svg{display:block;width:100%;height:150px}
.tl{display:flex;justify-content:space-between;position:relative;font-size:11.5px;color:var(--mu);font-weight:700;gap:4px}
.tl::before,.tl u{content:"";position:absolute;left:8px;right:8px;top:7px;height:3px;border-radius:3px;background:var(--ln)}
.tl u{right:auto;width:0;background:linear-gradient(90deg,var(--a1),var(--a2));box-shadow:0 0 12px var(--a2);transition:width 1.6s cubic-bezier(.3,.7,.2,1)}
.tl span{position:relative;display:grid;gap:8px;justify-items:center;text-align:center;max-width:64px;line-height:1.25}.tl span::before{content:"";width:17px;height:17px;border-radius:50%;background:var(--side);border:3px solid var(--ln);transition:border-color .5s 1s}
.tl span.on{color:var(--tx)}.tl span.on::before{border-color:var(--a2)}
.grid5{display:grid;gap:10px}
@media(max-width:860px){.app{grid-template-columns:1fr}.sb{position:fixed;z-index:20;left:0;top:0;width:240px;transform:translateX(-100%);transition:transform .35s cubic-bezier(.22,.8,.26,1)}.sb.o{transform:none;box-shadow:0 0 0 100vmax rgba(5,8,22,.5)}.hb{display:block}.r2{grid-template-columns:1fr}main{padding:16px}.kp b{font-size:26px}.tb h1{font-size:21px}}`;
function dashRun(c){
  const rs=document.documentElement.style;for(const k in c.th)rs.setProperty("--"+k,c.th[k]);
  let nav=0,rng=1,q="",sc=-1,dir=1,rows=c.rows.map(r=>r.slice()),W=0;
  const tone=s=>/Active|Settled|Paid|Delivered|Done|Checked in/.test(s)?"g":/Churned|Delayed/.test(s)?"b":/In transit|Scheduled/.test(s)?"i":"w";
  h(`<div class="app"><aside class="sb" id="sb"><div class="lg"><i></i>${c.n}</div><nav>${c.nav.map((n,i)=>`<button class="${i?"":"on"}" data-n="${i}"><span></span>${n}</button>`).join("")}</nav><div class="me">${ava("Uzair Ahmed",1)}<div><b>Uzair Ahmed</b><small>Admin</small></div></div></aside>
  <main><header class="tb"><button class="hb" id="hb" aria-label="Open menu">☰</button><h1 id="tt">${c.nav[0]}</h1>
   <div class="dd" id="dd"><button id="ddb" aria-haspopup="true">Last 30 days ▾</button><div class="ddm"><button data-r=".4">Last 7 days</button><button data-r="1">Last 30 days</button><button data-r="2.6">Last 90 days</button></div></div>
   <button class="pri" id="nw">+ ${c.add}</button></header>
   <section class="ks" id="ks"></section>
   <section class="r2"><div class="cd"><div class="ch"><b>${c.chart}</b><span class="lgd"><i></i>This period<i class="b"></i>Previous</span></div><div class="lc" id="lc"></div></div><div class="cd" id="spc"></div></section>
   <section class="cd"><div class="ch"><b>${c.tbl}</b><input id="q" type="search" placeholder="Search ${c.tbl.toLowerCase()}" aria-label="Search ${c.tbl.toLowerCase()}"></div><div class="tw"><table><thead><tr>${c.cols.map((x,i)=>`<th data-s="${i}">${x} ↕</th>`).join("")}</tr></thead><tbody id="tb"></tbody></table></div></section>
  </main></div>`);
  function kpis(){$("#ks").innerHTML=c.k.map((k,i)=>`<div class="kp"><small>${k[0]}</small><b data-i="${i}">0</b><em class="${k[5]?"dw":""}">${k[5]?"▼":"▲"} ${(1.4+((i*7+nav*3)%9)*.6).toFixed(1)}%</em></div>`).join("");
    $$("#ks b").forEach((b,i)=>{const k=c.k[i],pct=k[3]=="%";count(b,pct?k[1]:k[1]*(k[4]?1:rng)*(1+nav*.04),k[2]||"",k[3]||"",k[4]||0)})}
  function chart(){const el=$("#lc");W=el.clientWidth||600;const H=230,n=12,v=i=>48+Math.sin(i*.75+nav*1.3)*20+i*3.4+Math.cos(i*1.1+rng)*4,pv=i=>40+Math.sin(i*.6+nav)*12+i*2.4;
    const X=i=>10+i*(W-20)/(n-1),Y=y=>H-20-(y/110)*(H-40),P=[...Array(n)].map((_,i)=>[X(i),Y(v(i))]),P2=[...Array(n)].map((_,i)=>[X(i),Y(pv(i))]);
    el.innerHTML=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="${c.th.a1}"/><stop offset="1" stop-color="${c.th.a2}"/></linearGradient><linearGradient id="la" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c.th.a1}" stop-opacity=".28"/><stop offset="1" stop-color="${c.th.a1}" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3].map(i=>`<line class="gd" x1="0" x2="${W}" y1="${20+i*63}" y2="${20+i*63}"/>`).join("")}<path class="ar" d="${spline(P)}L${W-10} ${H}L10 ${H}Z"/><path class="pv" d="${spline(P2)}"/><path class="ln" pathLength="1" d="${spline(P)}"/></svg><i class="dot" id="dot"></i><div class="tip" id="tip"></div>`;
    el.onmousemove=e=>{const r=el.getBoundingClientRect(),i=Math.max(0,Math.min(n-1,Math.round((e.clientX-r.left-10)/((W-20)/(n-1))))),p=P[i];$("#dot").style.cssText=`left:${p[0]}px;top:${p[1]}px;opacity:1`;const t=$("#tip");t.style.cssText=`left:${p[0]}px;top:${p[1]}px;opacity:1`;t.textContent="Week "+(i+1)+" · "+(c.cur||"")+fmt(v(i)*rng*(c.cur?420:9))};
    el.onmouseleave=()=>{$("#dot").style.opacity=0;$("#tip").style.opacity=0}}
  function special(){const el=$("#spc");
    if(c.sp=="plans"){const a=[46-nav*3,32+nav,22+nav*2],cl=[c.th.a1,c.th.a2,"#22D3EE"];let o=0;el.innerHTML=`<div class="ch"><b>Plans</b></div><div class="dn" style="background:conic-gradient(${a.map((x,i)=>{const s=o;o+=x;return cl[i]+" "+s+"% "+o+"%"}).join(",")})"><div><b>${fmt(1284*rng)}</b><small>subscriptions</small></div></div><ul class="l2">${["Pro","Starter","Enterprise"].map((n,i)=>`<li><i style="background:${cl[i]}"></i>${n}<b>${a[i]}%</b></li>`).join("")}</ul>`}
    if(c.sp=="cards")el.innerHTML=`<div class="ch"><b>Cards</b><button class="gh" id="snd">Send money</button></div><div class="bk"><div class="bc"><small>Vaultly Platinum</small><b>•••• 4821</b><span>$62,400.00</span></div><div class="bc b2"><small>Business Debit</small><b>•••• 0937</b><span>$21,800.00</span></div></div>`;
    if(c.sp=="patients")el.innerHTML=`<div class="ch"><b>Next patients</b></div>`+rows.filter(r=>r[3]!="Done").slice(0,4).map((r,i)=>`<div class="pt">${ava(r[0],i+2,40)}<div><b>${r[0]}</b><small>${r[1]} · ${r[2]}</small></div>${r[3]=="Checked in"?'<span class="st g">Checked in</span>':`<button data-ci="${r[0]}">Check in</button>`}</div>`).join("");
    if(c.sp=="courses"){el.innerHTML=`<div class="ch"><b>Courses</b></div>`+[["Mathematics","Ms. Hina · 10-A",82,"#7C3AED"],["Physics","Mr. Asad · 9-B",64,"#3B82F6"],["English","Ms. Sana · 8-C",91,"#FBBF24"]].map(x=>`<div class="cr"><i style="background:${x[3]}"></i><div><b>${x[0]}</b><small>${x[1]} · ${x[2]}% complete</small><div class="pg"><u data-w="${x[2]}"></u></div></div></div>`).join("")+`<div class="wk">${[["Mon",96],["Tue",94],["Wed",88],["Thu",97],["Fri",92]].map(d=>`<span><i class="${d[1]<90?"lo":""}">${d[1]}</i>${d[0]}</span>`).join("")}</div>`;setTimeout(()=>$$(".pg u").forEach(u=>u.style.width=u.dataset.w+"%"),60)}
    if(c.sp=="track"){el.innerHTML=`<div class="ch"><b>SH-1042 · Lahore to Karachi</b></div><div class="map"><svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice"><defs><pattern id="mg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,.06)"/></pattern></defs><rect width="320" height="150" fill="url(#mg)"/><path d="M40 20C90 10 130 30 170 26S260 6 300 30L310 150H20Z" fill="rgba(59,130,246,.10)"/><path id="rt" d="M250 28C230 50 190 46 172 70S120 96 86 124" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3" stroke-linecap="round"/><path d="M250 28C230 50 190 46 172 70S120 96 86 124" fill="none" stroke="#FF7A18" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 7"><animate attributeName="stroke-dashoffset" from="26" to="0" dur="1.2s" repeatCount="indefinite"/></path><circle cx="250" cy="28" r="6" fill="#3B82F6"/><circle cx="86" cy="124" r="6" fill="#10B981"/><circle r="7" fill="#fff" stroke="#FF7A18" stroke-width="4"><animateMotion dur="7s" repeatCount="indefinite" path="M250 28C230 50 190 46 172 70S120 96 86 124"/></circle><text x="262" y="32" fill="#EAF4FF" font-size="10" font-weight="700">Lahore</text><text x="98" y="130" fill="#EAF4FF" font-size="10" font-weight="700">Karachi</text></svg></div><div class="tl"><u id="tlu"></u>${["Picked up","Lahore hub","In transit","Out for delivery","Delivered"].map((s,i)=>`<span class="${i<3?"on":""}">${s}</span>`).join("")}</div>`;setTimeout(()=>{$("#tlu").style.width="54%"},80)}}
  function table(){let r=rows.filter(a=>a.join(" ").toLowerCase().includes(q));if(sc>=0)r=[...r].sort((a,b)=>(a[sc]>b[sc]?1:-1)*dir);
    $("#tb").innerHTML=r.map((a,i)=>`<tr data-k="${a[0]}">${a.map((x,j)=>j==0?`<td>${ava(String(x),i+nav)}${x}</td>`:j==a.length-1?`<td><span class="st ${tone(x)}">${x}</span></td>`:typeof x=="number"?`<td class="${c.signed&&x>0?"in":""}">${c.signed?(x>0?"+":"−"):""}${c.cur||""}${fmt(Math.abs(x))}</td>`:`<td>${x}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${c.cols.length}" style="display:table-cell;color:var(--mu);font-weight:500;padding:26px 10px">Nothing matches “${q}”. Clear the search to see every record.</td></tr>`}
  function all(load){if(!load){kpis();chart();special();table();return}
    $("#ks").innerHTML=`<div class="skb" style="height:104px"></div>`.repeat(c.k.length);$("#lc").innerHTML=sk(1,230);$("#spc").innerHTML=sk(1,230);$("#tb").innerHTML=`<tr><td colspan="${c.cols.length}" style="display:table-cell"><div class="grid5">${sk(4,34)}</div></td></tr>`;
    setTimeout(()=>all(),480)}
  all();addEventListener("resize",()=>{if(Math.abs(($("#lc").clientWidth||W)-W)>4)chart()});
  $("#q").oninput=e=>{q=e.target.value.toLowerCase();table()};
  document.addEventListener("click",e=>{const t=e.target;
    if(t.id!="ddb")$("#dd").classList.remove("o");
    if(t.id=="ddb")$("#dd").classList.toggle("o");
    if(t.dataset.r){rng=+t.dataset.r;$("#ddb").textContent=t.textContent+" ▾";all(1)}
    const nb=t.closest("[data-n]");if(nb){$$("[data-n]").forEach(b=>b.classList.remove("on"));nb.classList.add("on");nav=+nb.dataset.n;$("#tt").textContent=c.nav[nav];$("#sb").classList.remove("o");all(1)}
    if(t.id=="hb"){$("#sb").classList.toggle("o");return}
    if(!t.closest("#sb"))$("#sb").classList.remove("o");
    if(t.dataset.s){const s=+t.dataset.s;dir=sc==s?-dir:1;sc=s;table()}
    if(t.dataset.ci){const r=rows.find(x=>x[0]==t.dataset.ci);r[3]="Checked in";special();table();toast(r[0]+" checked in");return}
    if(t.id=="nw"||t.id=="snd")modal(`<h3>New ${c.add.toLowerCase()}</h3><p>Add a record to see the table update. Demo data only.</p><div class="k-f"><label>${c.cols[0]}<input id="nn" placeholder="${c.rows[0][0]}"></label><div class="k-e" id="ne"></div><button class="k-b" id="ns">Add ${c.add.toLowerCase()}</button></div>`);
    if(t.id=="ns"){const v=$("#nn").value.trim();if(v.length<2){$("#ne").textContent="Enter a name with at least 2 characters.";return}const r=c.rows[0].slice();r[0]=v;r[r.length-1]=c.ns;rows.unshift(r);shut();table();if(c.sp=="patients")special();toast(c.add+" added: "+v)}
    const tr=t.closest("tbody tr[data-k]");if(tr){const r=rows.find(x=>x[0]==tr.dataset.k);drawer(`<h3>${r[0]}</h3><p>${c.tbl} record</p><div class="k-dl">${c.cols.slice(1).map((k,i)=>`<div><span>${k}</span><b>${typeof r[i+1]=="number"?(c.cur||"")+fmt(Math.abs(r[i+1])):r[i+1]}</b></div>`).join("")}</div><button class="k-b" id="ex" style="width:100%">Export record</button>`)}
    if(t.id=="ex"){shut();toast("Record exported")}});
}

/* ---------------- AI workspace ---------------- */
const AI_CSS=`body{--bg:#07051A;--tx:#EDEBFF;background:radial-gradient(50% 50% at 70% 0%,rgba(124,58,237,.35),transparent 70%),radial-gradient(40% 40% at 10% 100%,rgba(34,211,238,.20),transparent 70%),#07051A;min-height:100vh}
.app{display:grid;grid-template-columns:270px minmax(0,1fr);height:100vh}
.sb{padding:20px 14px;border-right:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;gap:10px;overflow:auto;background:rgba(255,255,255,.02)}
.lg{font-weight:800;font-size:18px;letter-spacing:-.02em;display:flex;gap:10px;align-items:center;padding:0 6px 10px}.lg i{width:26px;height:26px;border-radius:50%;background:conic-gradient(#A855F7,#22D3EE,#3B82F6,#A855F7)}
.sb small{color:#8E88B8;font-weight:700;font-size:12px;padding:6px}
.ag{position:relative;display:flex;gap:12px;align-items:center;padding:12px;border-radius:16px;text-align:left;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);transition:transform .3s,border-color .3s,background .3s;width:100%}
.ag:hover{transform:translateX(3px)}.ag i{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--x),var(--y));box-shadow:0 8px 20px -8px var(--x);flex:none}
.ag b{display:block;font-size:14.5px}.ag span{font-size:12px;color:#8E88B8}
.ag.on{border-color:transparent;background:linear-gradient(#120D2E,#120D2E) padding-box,linear-gradient(120deg,var(--x),var(--y)) border-box}
main{display:flex;flex-direction:column;min-width:0;height:100vh}
.tp{display:flex;gap:10px;align-items:center;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.08)}.tp b{font-size:16px;margin-right:auto}
.tp button{height:38px;padding:0 14px;border-radius:11px;border:1px solid rgba(255,255,255,.14);font-weight:600}
.hb{display:none}
.cv{flex:1;overflow:auto;padding:28px 24px;display:flex;flex-direction:column;gap:16px}
.hi{margin:auto;text-align:center;display:grid;gap:18px;justify-items:center;max-width:560px;transition:opacity .4s}
.orb{width:130px;height:130px;border-radius:50%;background:conic-gradient(from 0deg,var(--x),var(--y),#3B82F6,var(--x));filter:blur(3px);box-shadow:0 0 70px var(--x),inset 0 0 30px rgba(255,255,255,.55);animation:sp 9s linear infinite,pu 3.6s ease-in-out infinite;transition:box-shadow .6s}
.orb.t{animation-duration:1.6s,1s}
@keyframes sp{to{transform:rotate(360deg)}}@keyframes pu{50%{scale:1.07}}
.hi h1{font-size:clamp(26px,4vw,40px);letter-spacing:-.035em;line-height:1.05}
.hi p{color:#8E88B8}
.cps{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.cp{padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);font-weight:600;font-size:13.5px;transition:.25s}.cp:hover{border-color:var(--y);transform:translateY(-2px)}
.ms{max-width:720px;width:100%;margin:0 auto;display:flex;gap:12px;animation:up .4s cubic-bezier(.22,.8,.26,1)}@keyframes up{from{opacity:0;transform:translateY(10px)}}
.ms.u{justify-content:flex-end}.ms.u div{background:linear-gradient(110deg,#7C3AED,#3B82F6);border-radius:18px 18px 4px 18px;padding:11px 16px;max-width:80%;font-weight:600}
.ms .av{width:32px;height:32px;border-radius:50%;flex:none;background:conic-gradient(var(--x),var(--y),var(--x))}
.ms .bb{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:4px 18px 18px 18px;padding:14px 16px;line-height:1.65;min-width:60px}
.ms .bb small{display:block;color:var(--y);font-weight:700;margin-bottom:4px}
.ac{display:flex;gap:6px;margin-top:10px}.ac button{font-size:12px;font-weight:700;padding:6px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.14);color:#C9C4EE}
.ty{display:inline-flex;gap:5px}.ty i{width:7px;height:7px;border-radius:50%;background:var(--y);animation:bl 1s infinite}.ty i:nth-child(2){animation-delay:.15s}.ty i:nth-child(3){animation-delay:.3s}
@keyframes bl{50%{opacity:.25;transform:translateY(-3px)}}
.cur::after{content:"";display:inline-block;width:8px;height:16px;margin-left:2px;vertical-align:-2px;background:var(--y);animation:bl 1s steps(2) infinite}
.cm{padding:14px 24px 22px}
.cmi{max-width:720px;margin:0 auto;display:flex;gap:8px;padding:8px;border-radius:18px;border:1.5px solid transparent;background:linear-gradient(#0F0B26,#0F0B26) padding-box,linear-gradient(110deg,var(--x),#3B82F6,var(--y)) border-box;box-shadow:0 0 40px -12px var(--x);transition:box-shadow .5s}
.cmi input{flex:1;min-width:0;height:44px;border:0;background:none;outline:0;padding:0 10px;font-size:15px}
.cmi button{height:44px;padding:0 18px;border-radius:12px;background:linear-gradient(110deg,var(--x),var(--y));color:#fff;font-weight:700}
@media(max-width:820px){.app{grid-template-columns:1fr}.sb{position:fixed;z-index:20;inset:0 auto 0 0;width:270px;background:#0B0822;transform:translateX(-100%);transition:transform .35s}.sb.o{transform:none;box-shadow:0 0 0 100vmax rgba(0,0,0,.5)}.hb{display:block}}`;
function aiRun(){
  const AG=[["Analyst","Reports and numbers","#A855F7","#22D3EE",p=>`Here is a first pass on “${p}”. Revenue grew 18% quarter over quarter, driven mostly by Pro upgrades. Churn held at 2.1%. Three accounts need a follow-up this week: Orbit Co, Luma Health and Kite Studio. I can turn this into a slide or a table next.`],["Writer","Briefs and copy","#EC4899","#FF7A18",p=>`Draft for “${p}”: Start with the outcome the customer wants, then show the product doing it in one sentence. Follow with two proof points and a single call to action. I kept it under 120 words so it fits an email, a landing page or a pitch slide.`],["Data","Clean and transform","#22D3EE","#10B981",p=>`Done with “${p}”. I removed 42 duplicate rows, normalised the date column to ISO format and flagged 7 records with missing phone numbers. The cleaned file has 1,286 rows and is ready to export as CSV.`],["Support","Customer replies","#3B82F6","#A855F7",p=>`Suggested reply for “${p}”: Thanks for reaching out. I can see the order left our Lahore hub this morning and should arrive within two working days. I have added a tracking link below and will check in again once it is delivered.`]];
  let a=0,busy=0,last="";const set=()=>{const s=document.documentElement.style;s.setProperty("--x",AG[a][2]);s.setProperty("--y",AG[a][3])};set();
  h(`<div class="app"><aside class="sb" id="sb"><div class="lg"><i></i>Cortex</div><small>Agents</small>${AG.map((g,i)=>`<button class="ag ${i?"":"on"}" data-a="${i}" style="--x:${g[2]};--y:${g[3]}"><i></i><span><b>${g[0]}</b><span>${g[1]}</span></span></button>`).join("")}<small style="margin-top:10px">Recent</small><button class="cp" data-p="Summarize the Q3 report" style="text-align:left">Summarize the Q3 report</button><button class="cp" data-p="Clean the sales CSV" style="text-align:left">Clean the sales CSV</button></aside>
  <main><div class="tp"><button class="hb" id="hb" aria-label="Open agents">☰</button><b id="an">Analyst agent</b><button id="nc">New chat</button></div>
  <div class="cv" id="cv"></div>
  <div class="cm"><div class="cmi"><input id="pi" placeholder="Ask the agent anything" aria-label="Prompt"><button id="sd">Send</button></div></div></main></div>`);
  const cv=$("#cv"),hello=()=>{cv.innerHTML=`<div class="hi"><div class="orb" id="orb"></div><h1>What should we work on?</h1><p>Pick an agent on the left, choose a starter, or type your own prompt.</p><div class="cps">${["Summarize the Q3 report","Draft a product brief","Clean the sales CSV","Reply to a late delivery"].map(p=>`<button class="cp" data-p="${p}">${p}</button>`).join("")}</div></div>`};hello();
  function send(p){p=(p||$("#pi").value).trim();if(!p||busy)return;busy=1;last=p;$("#pi").value="";const hi=$(".hi");hi&&hi.remove();
    cv.insertAdjacentHTML("beforeend",`<div class="ms u"><div></div></div><div class="ms"><i class="av"></i><div class="bb"><small>${AG[a][0]}</small><span class="ty"><i></i><i></i><i></i></span></div></div>`);
    const ms=$$(".ms",cv);ms[ms.length-2].firstChild.textContent=p;const bb=ms[ms.length-1].querySelector(".bb");cv.scrollTop=cv.scrollHeight;
    const words=AG[a][4](p).split(" ");let i=0;setTimeout(()=>{bb.innerHTML=`<small>${AG[a][0]}</small><span class="cur"></span>`;const sp=bb.querySelector(".cur");
      const t=setInterval(()=>{sp.textContent+=(i?" ":"")+words[i++];cv.scrollTop=cv.scrollHeight;if(i>=words.length){clearInterval(t);sp.classList.remove("cur");bb.insertAdjacentHTML("beforeend",'<div class="ac"><button data-cp>Copy</button><button data-rg>Regenerate</button></div>');busy=0}},34)},900)}
  document.addEventListener("click",e=>{const t=e.target,g=t.closest("[data-a]");
    if(t.id=="hb"){$("#sb").classList.toggle("o");return}
    if(g){a=+g.dataset.a;$$(".ag").forEach(x=>x.classList.toggle("on",x==g));set();$("#an").textContent=AG[a][0]+" agent";$("#sb").classList.remove("o");toast(AG[a][0]+" agent selected")}
    else if(!t.closest("#sb"))$("#sb").classList.remove("o");
    if(t.dataset.p){$("#sb").classList.remove("o");send(t.dataset.p)}
    if(t.id=="sd")send();if(t.id=="nc"){if(!busy){hello();toast("New chat started")}}
    if(t.dataset.cp!=null)toast("Response copied");if(t.dataset.rg!=null)send(last)});
  $("#pi").addEventListener("keydown",e=>{if(e.key=="Enter")send()});
}

/* ---------------- CRM pipeline ---------------- */
const CRM_CSS=`body{--bg:#F4F7FB;--a1:#3B82F6;--a2:#7C3AED;min-height:100vh}
.tp{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:18px 22px;background:#fff;border-bottom:1px solid #E5EAF2;position:sticky;top:0;z-index:5}
.lg{display:flex;gap:10px;align-items:center;font-weight:800;font-size:18px;letter-spacing:-.02em;margin-right:auto}.lg i{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#4F46E5,#3B82F6)}
.tp input{height:40px;border-radius:11px;border:1px solid #E5EAF2;padding:0 12px;width:200px;max-width:100%}
.sm{display:flex;gap:26px;padding:20px 22px 4px;flex-wrap:wrap}.sm small{display:block;color:#64748B;font-weight:600;font-size:12.5px}.sm b{font-size:30px;letter-spacing:-.04em;font-weight:800}
.bd{display:grid;grid-template-columns:repeat(5,minmax(210px,1fr));gap:14px;padding:16px 22px 40px;overflow-x:auto;align-items:start}
.col{background:#EBF0F7;border-radius:18px;padding:12px;min-height:420px;transition:background .2s,box-shadow .2s}
.col.ov{background:#fff;box-shadow:0 0 0 2px var(--s),0 20px 40px -20px var(--s)}
.col h4{display:flex;gap:8px;align-items:center;font-size:14px;margin-bottom:4px}.col h4::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--s);box-shadow:0 0 0 4px color-mix(in srgb,var(--s) 22%,transparent)}
.col h4 span{margin-left:auto;color:#64748B;font-size:12px}
.col>small{display:block;color:#64748B;font-weight:700;font-size:12px;margin-bottom:10px;padding-left:18px}
.ld{background:#fff;border-radius:14px;padding:12px 12px 12px 15px;margin-bottom:9px;position:relative;cursor:grab;box-shadow:0 1px 2px rgba(8,20,38,.06);transition:transform .25s,box-shadow .25s,opacity .2s;overflow:hidden;animation:up .35s cubic-bezier(.22,.8,.26,1)}
@keyframes up{from{opacity:0;transform:translateY(8px)}}
.ld::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--s)}
.ld:hover{transform:translateY(-2px);box-shadow:0 14px 28px -14px rgba(8,20,38,.3)}.ld.dg{opacity:.4}
.ld b{display:block}.ld small{color:#64748B}.ld div{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-weight:800}
.mv{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}.mv button{padding:8px 12px;border-radius:10px;border:1px solid #E2E8F0;font-weight:700;font-size:13px}.mv button.on{background:var(--s);color:#fff;border-color:transparent}`;
function crmRun(){
  const S=[["New","#3B82F6"],["Contacted","#22D3EE"],["Qualified","#7C3AED"],["Proposal","#FF7A18"],["Won","#10B981"]];
  let L=[["Orbit Co","Sara Malik",420,0],["Delta Freight","Omar Butt",80,0],["Zenith Labs","Hamza Ali",150,1],["Northwind","Rida Shah",310,1],["Kite Studio","Bilal Ahmed",900,2],["Luma Health","Zoya Khan",275,3],["Acme Ltd","Imran Ali",600,4]],q="",dg=-1;
  h(`<div class="tp"><div class="lg"><i></i>Pipeline</div><input id="q" type="search" placeholder="Search leads" aria-label="Search leads"><button class="k-b" id="ad">+ Add lead</button></div><div class="sm" id="sm"></div><div class="bd" id="bd"></div>`);
  function R(){const tot=L.reduce((a,l)=>a+l[2],0),won=L.filter(l=>l[3]==4).reduce((a,l)=>a+l[2],0);
    $("#sm").innerHTML=`<div><small>Open pipeline</small><b>Rs ${fmt(tot-won)}k</b></div><div><small>Won this month</small><b style="color:#10B981">Rs ${fmt(won)}k</b></div><div><small>Leads</small><b>${L.length}</b></div>`;
    $("#bd").innerHTML=S.map((s,i)=>{const c=L.map((l,j)=>[l,j]).filter(x=>x[0][3]==i&&x[0].join(" ").toLowerCase().includes(q));return`<div class="col" data-c="${i}" style="--s:${s[1]}"><h4>${s[0]}<span>${c.length}</span></h4><small>Rs ${fmt(c.reduce((a,x)=>a+x[0][2],0))}k</small>${c.map(x=>`<div class="ld" draggable="true" tabindex="0" data-j="${x[1]}"><b>${x[0][0]}</b><small>${x[0][1]}</small><div>Rs ${x[0][2]}k ${ava(x[0][1],x[1],26)}</div></div>`).join("")}</div>`}).join("")}
  function move(j,to){if(L[j][3]==to)return;L[j][3]=to;R();toast(to==4?"Deal won: "+L[j][0]+", Rs "+L[j][2]+"k":L[j][0]+" moved to "+S[to][0])}
  function open(j){const l=L[j];drawer(`<h3>${l[0]}</h3><p>${l[1]} · Rs ${l[2]}k</p><b style="display:block;margin-bottom:8px">Move to stage</b><div class="mv">${S.map((s,i)=>`<button data-mv="${j},${i}" class="${l[3]==i?"on":""}" style="--s:${s[1]}">${s[0]}</button>`).join("")}</div><div class="k-dl"><div><span>Owner</span><b>Uzair Ahmed</b></div><div><span>Source</span><b>Website demo</b></div><div><span>Next step</span><b>Send proposal</b></div></div>`)}
  R();const bd=$("#bd");
  bd.addEventListener("dragstart",e=>{const c=e.target.closest(".ld");if(!c)return;dg=+c.dataset.j;c.classList.add("dg");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dg)});
  bd.addEventListener("dragend",()=>{$$(".dg,.ov").forEach(x=>x.classList.remove("dg","ov"))});
  bd.addEventListener("dragover",e=>{const c=e.target.closest(".col");if(!c)return;e.preventDefault();$$(".col").forEach(x=>x.classList.toggle("ov",x==c))});
  bd.addEventListener("drop",e=>{const c=e.target.closest(".col");if(!c||dg<0)return;e.preventDefault();move(dg,+c.dataset.c);dg=-1});
  bd.addEventListener("keydown",e=>{if(e.key=="Enter"&&e.target.dataset.j)open(+e.target.dataset.j)});
  $("#q").oninput=e=>{q=e.target.value.toLowerCase();R()};
  document.addEventListener("click",e=>{const t=e.target,c=t.closest(".ld");
    if(c)open(+c.dataset.j);
    if(t.dataset.mv){const[j,i]=t.dataset.mv.split(",");shut();move(+j,+i)}
    if(t.id=="ad")modal(`<h3>Add a lead</h3><p>New leads start in the first stage.</p><div class="k-f"><label>Company<input id="ln" placeholder="Company name"></label><label>Deal value (Rs thousands)<input id="lv" type="number" value="100" min="1"></label><div class="k-e" id="le"></div><button class="k-b" id="ls">Add lead</button></div>`);
    if(t.id=="ls"){const n=$("#ln").value.trim(),v=+$("#lv").value;if(n.length<2){$("#le").textContent="Enter a company name with at least 2 characters.";return}if(!(v>0)){$("#le").textContent="Enter a deal value above zero.";return}L.push([n,"Uzair Ahmed",v,0]);shut();R();toast("Lead added: "+n)}});
}

/* ---------------- ecommerce store ---------------- */
const STORE_CSS=`body{--bg:#FFF8EE;--tx:#1B1410;--a1:#FF7A18;--a2:#EC4899}
.hd{position:sticky;top:0;z-index:6;display:flex;gap:10px;align-items:center;padding:14px 24px;background:rgba(255,248,238,.9);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid #F0E4D2}
.hd b{font-size:22px;font-weight:800;letter-spacing:-.04em;margin-right:auto}
.hd input{height:42px;border-radius:99px;border:1px solid #E9DCC7;background:#fff;padding:0 16px;width:min(260px,40vw)}
.ct{height:42px;padding:0 16px;border-radius:99px;background:#1B1410;color:#fff;font-weight:700;display:flex;gap:8px;align-items:center}.ct i{font-style:normal;background:#FF7A18;border-radius:99px;min-width:22px;height:22px;display:grid;place-items:center;font-size:12px;transition:transform .3s}.ct i.b{transform:scale(1.35)}
.wr{max-width:1180px;margin:0 auto;padding:22px 24px 50px}
.bn{position:relative;overflow:hidden;border-radius:28px;padding:clamp(26px,5vw,56px);color:#fff;background:linear-gradient(110deg,#FF7A18,#EC4899 70%,#C026D3);display:grid;grid-template-columns:1.2fr 1fr;align-items:center;gap:20px}
.bn em{font-style:normal;display:inline-block;background:#fff;color:#1B1410;font-weight:800;font-size:13px;padding:6px 12px;border-radius:99px;margin-bottom:14px}
.bn h1{font-size:clamp(34px,6vw,68px);line-height:.95;letter-spacing:-.045em;font-weight:800}
.bn p{margin:14px 0 20px;font-size:16px;opacity:.95;max-width:34ch}
.bn button{height:50px;padding:0 24px;border-radius:99px;background:#1B1410;color:#fff;font-weight:800;transition:transform .25s}.bn button:hover{transform:translateY(-2px)}
.bn svg{width:100%;max-height:240px;filter:drop-shadow(0 30px 30px rgba(0,0,0,.3));animation:fl 6s ease-in-out infinite}@keyframes fl{50%{transform:translateY(-10px) rotate(-3deg)}}
.cs{display:flex;gap:8px;margin:26px 0 18px;overflow-x:auto;scrollbar-width:none}
.cs button{flex:none;height:42px;padding:0 18px;border-radius:99px;border:1.5px solid #E9DCC7;font-weight:700;background:#fff;transition:.2s}.cs button.on{background:#1B1410;color:#fff;border-color:#1B1410}
.gr{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
.pc{background:#fff;border-radius:22px;padding:12px;transition:transform .35s cubic-bezier(.22,.8,.26,1),box-shadow .35s;animation:up .4s both}@keyframes up{from{opacity:0;transform:translateY(12px)}}
.pc:hover{transform:translateY(-6px);box-shadow:0 30px 50px -30px rgba(120,60,10,.5)}
.im{position:relative;height:200px;border-radius:16px;display:grid;place-items:center;cursor:pointer;overflow:hidden}.im svg{width:62%;transition:transform .5s}.pc:hover .im svg{transform:scale(1.08) rotate(-3deg)}
.tg{position:absolute;left:10px;top:10px;padding:5px 10px;border-radius:99px;font-size:12px;font-weight:800;background:#1B1410;color:#fff}.tg.s{background:#FF7A18}
.hr{position:absolute;right:10px;top:10px;width:36px;height:36px;border-radius:50%;background:#fff;font-size:17px;display:grid;place-items:center;transition:transform .25s}.hr.on{color:#EC4899;transform:scale(1.15)}
.pc h3{font-size:17px;letter-spacing:-.02em;margin:12px 4px 2px}.pc small{color:#8A7868;margin:0 4px;font-weight:600}
.pf{display:flex;justify-content:space-between;align-items:center;margin:10px 4px 4px}.pf b{font-size:19px;letter-spacing:-.03em}
.pf button{height:40px;padding:0 16px;border-radius:99px;background:linear-gradient(110deg,#FF7A18,#EC4899);color:#fff;font-weight:800}
.em{grid-column:1/-1;padding:50px;text-align:center;color:#8A7868;border:1.5px dashed #E9DCC7;border-radius:22px}
.li{display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid #EEF2F7}.li .im{width:60px;height:60px;border-radius:12px;flex:none;cursor:default}.li div{flex:1}.li small{color:#64748B}
.qt{display:flex;gap:6px;align-items:center}.qt button{width:30px;height:30px;border-radius:9px;border:1px solid #E2E8F0;font-weight:800}
@media(max-width:640px){.bn{grid-template-columns:1fr}.bn svg{display:none}.hd{padding:12px 16px}.wr{padding:16px 16px 40px}.gr{grid-template-columns:1fr 1fr;gap:12px}.im{height:150px}.pf{flex-direction:column;align-items:stretch;gap:8px}}`;
function storeRun(){
  const art=(k,c)=>({h:`<svg viewBox="0 0 100 100"><path d="M22 60V48a28 28 0 0156 0v12" fill="none" stroke="#1B1410" stroke-width="7" stroke-linecap="round"/><rect x="12" y="54" width="20" height="32" rx="9" fill="${c}"/><rect x="68" y="54" width="20" height="32" rx="9" fill="${c}"/></svg>`,w:`<svg viewBox="0 0 100 100"><rect x="36" y="4" width="28" height="92" rx="9" fill="#1B1410"/><rect x="24" y="26" width="52" height="48" rx="15" fill="${c}"/><rect x="33" y="35" width="34" height="30" rx="8" fill="#fff" opacity=".9"/><path d="M50 42v9l6 4" stroke="#1B1410" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`,l:`<svg viewBox="0 0 100 100"><path d="M30 10h40l14 40H16z" fill="${c}"/><rect x="46" y="50" width="8" height="34" fill="#1B1410"/><rect x="28" y="82" width="44" height="9" rx="4.5" fill="#1B1410"/></svg>`,s:`<svg viewBox="0 0 100 100"><rect x="22" y="6" width="56" height="88" rx="16" fill="${c}"/><circle cx="50" cy="30" r="10" fill="#1B1410"/><circle cx="50" cy="64" r="18" fill="#1B1410"/><circle cx="50" cy="64" r="7" fill="#fff" opacity=".85"/></svg>`,v:`<svg viewBox="0 0 100 100"><path d="M38 8h24v14c0 10 16 20 16 40 0 18-12 30-28 30S22 80 22 62c0-20 16-30 16-40z" fill="${c}"/><path d="M34 60c6 6 26 6 32 0" stroke="#fff" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/></svg>`}[k]);
  const P=[["Studio Headphones",24900,"Audio","h","#FF7A18","#FFE7D1","New"],["Pulse Smart Watch",18500,"Wearables","w","#EC4899","#FDE3F0","−20%"],["Arc Desk Lamp",6900,"Home","l","#FBBF24","#FFF3CF",""],["Boom Speaker",12900,"Audio","s","#7C3AED","#EDE5FF","New"],["Terra Vase",3500,"Home","v","#10B981","#DBF6EA",""],["Aero Headphones",15900,"Audio","h","#3B82F6","#DEEAFF","−15%"],["Loop Fitness Watch",7900,"Wearables","w","#10B981","#DBF6EA",""],["Glow Lamp Mini",4900,"Home","l","#EC4899","#FDE3F0","New"]];
  let cat="All",q="",C={},W={};
  h(`<header class="hd"><b>aurelia</b><input id="q" type="search" placeholder="Search products" aria-label="Search products"><button class="ct" id="cb">Cart <i id="cn">0</i></button></header>
  <div class="wr"><section class="bn"><div><em>New season</em><h1>Sound that fills the room.</h1><p>Up to 30% off audio this week. Free delivery across Pakistan on orders over Rs 10,000.</p><button id="sh">Shop the sale</button></div>${art("h","#FBBF24")}</section>
  <div class="cs" id="cs">${["All","Audio","Wearables","Home"].map(c=>`<button data-c="${c}" class="${c=="All"?"on":""}">${c}</button>`).join("")}</div><div class="gr" id="gr"></div></div>`);
  const img=(i,x="")=>`<div class="im" style="background:${P[i][5]}" ${x}>${art(P[i][3],P[i][4])}</div>`;
  function R(){$("#gr").innerHTML=P.map((p,i)=>(cat=="All"||p[2]==cat)&&p[0].toLowerCase().includes(q)?`<article class="pc" style="animation-delay:${i*40}ms"><div class="im" style="background:${p[5]}" data-v="${i}">${art(p[3],p[4])}${p[6]?`<span class="tg ${p[6][0]=="−"?"s":""}">${p[6]}</span>`:""}<button class="hr ${W[i]?"on":""}" data-w="${i}" aria-label="Save ${p[0]}">${W[i]?"♥":"♡"}</button></div><h3>${p[0]}</h3><small>${p[2]} · ★ 4.${6+i%4}</small><div class="pf"><b>Rs ${fmt(p[1])}</b><button data-add="${i}">Add to cart</button></div></article>`:"").join("")||`<div class="em"><b>No products match “${q}”.</b><br>Try another search or pick a different category.</div>`}
  function cart(){const k=Object.keys(C);let s=0;$("#cn").textContent=k.reduce((a,i)=>a+C[i],0);return`<h3>Your cart</h3>`+(k.length?k.map(i=>{s+=P[i][1]*C[i];return`<div class="li">${img(i)}<div><b>${P[i][0]}</b><br><small>Rs ${fmt(P[i][1])}</small></div><div class="qt"><button data-q="${i},-1" aria-label="Remove one">−</button><b>${C[i]}</b><button data-q="${i},1" aria-label="Add one">+</button></div></div>`}).join("")+`<div class="k-dl"><div><span>Total</span><b>Rs ${fmt(s)}</b></div></div><button class="k-b" id="co" style="width:100%">Place order</button>`:`<p>Your cart is empty. Add a product to see it here.</p>`)}
  function add(i){C[i]=(C[i]||0)+1;cart();const b=$("#cn");b.classList.add("b");setTimeout(()=>b.classList.remove("b"),300);toast(P[i][0]+" added to cart")}
  R();$("#q").oninput=e=>{q=e.target.value.toLowerCase();R()};
  document.addEventListener("click",e=>{const t=e.target,v=t.closest("[data-v]");
    if(t.dataset.c){cat=t.dataset.c;$$("#cs button").forEach(b=>b.classList.toggle("on",b==t));R()}
    if(t.dataset.w){W[t.dataset.w]=!W[t.dataset.w];R();toast(W[t.dataset.w]?"Saved to wishlist":"Removed from wishlist");return}
    if(t.dataset.add){add(+t.dataset.add);if(t.closest("#km"))shut();return}
    if(v){const i=+v.dataset.v,p=P[i];modal(`${img(i,'style="height:220px;margin-bottom:14px;background:'+p[5]+'"')}<h3>${p[0]}</h3><p>${p[2]} · ★ 4.${6+i%4} · 1-year warranty. Delivered in 2 to 4 working days.</p><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:22px">Rs ${fmt(p[1])}</b><button class="k-b" data-add="${i}">Add to cart</button></div>`)}
    if(t.id=="cb")drawer(cart());if(t.id=="sh"){cat="Audio";$$("#cs button").forEach(b=>b.classList.toggle("on",b.dataset.c==cat));R();$("#cs").scrollIntoView({behavior:"smooth"})}
    if(t.dataset.q){const[i,d]=t.dataset.q.split(",");C[i]+=+d;if(C[i]<1)delete C[i];$("#kdb").innerHTML=cart()}
    if(t.id=="co"){C={};cart();shut();toast("Order placed (demo mode)")}});
}

/* ---------------- mobile app ---------------- */
const MOB_CSS=`body{min-height:100vh;display:grid;place-items:center;background:radial-gradient(50% 50% at 20% 20%,rgba(236,72,153,.55),transparent 70%),radial-gradient(50% 50% at 85% 80%,rgba(124,58,237,.6),transparent 70%),#12082B;--a1:#EC4899;--a2:#A855F7;padding:20px 0}
.ph{position:relative;width:390px;height:min(800px,calc(100vh - 40px));border-radius:54px;background:#0B0714;padding:12px;box-shadow:0 60px 120px -30px rgba(0,0,0,.8),0 0 0 2px rgba(255,255,255,.14),0 0 120px -20px rgba(236,72,153,.6)}
.ph::before{content:"";position:absolute;z-index:5;top:22px;left:50%;width:110px;height:30px;margin-left:-55px;border-radius:20px;background:#0B0714}
.sc{height:100%;border-radius:43px;overflow:hidden;background:#FBF8FF;color:#1A1230;display:flex;flex-direction:column;position:relative}
.pg{flex:1;overflow:auto;padding:64px 20px 20px;animation:in .4s cubic-bezier(.22,.8,.26,1)}@keyframes in{from{opacity:0;transform:translateX(16px)}}
.pg h2{font-size:28px;letter-spacing:-.04em;line-height:1.1}.pg>small{color:#7A7391;font-weight:600}
.hc{margin:18px 0;border-radius:26px;padding:20px;color:#fff;background:linear-gradient(135deg,#EC4899,#A855F7);display:flex;gap:16px;align-items:center;box-shadow:0 24px 40px -22px #A855F7}
.rg{position:relative;width:104px;height:104px;flex:none}.rg svg{transform:rotate(-90deg)}.rg circle{fill:none;stroke-width:10;stroke-linecap:round}
.rg .fg{stroke:#fff;stroke-dasharray:264;stroke-dashoffset:264;transition:stroke-dashoffset 1.3s cubic-bezier(.3,.7,.2,1)}
.rg b{position:absolute;inset:0;display:grid;place-items:center;font-size:22px;font-weight:800}
.hc small{opacity:.9;font-weight:600}.hc strong{display:block;font-size:30px;letter-spacing:-.04em;line-height:1.1}
.tl2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.tl2 div{background:#fff;border-radius:20px;padding:14px;box-shadow:0 1px 2px rgba(26,18,48,.06)}.tl2 small{color:#7A7391;font-weight:600;display:block}.tl2 b{font-size:22px;letter-spacing:-.03em}
.sh{display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px}.sh b{font-size:17px}.sh button{font-weight:800;color:#A855F7}
.rw{display:flex;gap:12px;align-items:center;background:#fff;border-radius:18px;padding:12px;margin-bottom:10px;animation:in .4s both}.rw i{width:42px;height:42px;border-radius:14px;flex:none;background:linear-gradient(135deg,var(--x),var(--y))}
.rw div{flex:1}.rw small{display:block;color:#7A7391}.rw button{width:32px;height:32px;border-radius:50%;color:#7A7391;font-size:17px}
.br{display:flex;gap:10px;align-items:flex-end;height:150px;background:#fff;border-radius:22px;padding:16px;margin:16px 0}.br span{flex:1;display:grid;gap:6px;justify-items:center;font-size:11px;font-weight:700;color:#7A7391;align-content:end;height:100%}
.br i{width:100%;border-radius:8px;background:linear-gradient(#EC4899,#A855F7);height:0;transition:height .9s cubic-bezier(.3,.7,.2,1)}
.sw{width:48px;height:28px;border-radius:99px;background:#D9D3EA;position:relative;transition:background .25s}.sw::after{content:"";position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .3s cubic-bezier(.22,.8,.26,1)}.sw.on{background:#A855F7}.sw.on::after{transform:translateX(20px)}
.nv{position:relative;display:grid;grid-template-columns:repeat(4,1fr);background:#fff;padding:8px 10px 18px;border-top:1px solid #EFEAF9}
.nv button{height:50px;font-size:11.5px;font-weight:700;color:#9A93B2;display:grid;justify-items:center;gap:3px;position:relative;z-index:1;transition:color .3s}.nv button::before{content:"";width:20px;height:20px;border-radius:7px;background:currentColor;opacity:.85}
.nv button.on{color:#A855F7}.nv u{position:absolute;top:0;left:10px;height:3px;width:calc((100% - 20px)/4);border-radius:3px;background:linear-gradient(90deg,#EC4899,#A855F7);transition:transform .4s cubic-bezier(.22,.8,.26,1)}
.ob{flex:1;display:grid;place-items:center;text-align:center;padding:30px;color:#fff;background:linear-gradient(160deg,#EC4899,#A855F7 60%,#6D28D9)}
.ob h1{font-size:44px;letter-spacing:-.05em;line-height:1}.ob p{opacity:.9;margin:12px 0 26px}.ob button{height:54px;padding:0 30px;border-radius:99px;background:#fff;color:#1A1230;font-weight:800;font-size:16px}
.ob .lo{width:84px;height:84px;border-radius:28px;background:rgba(255,255,255,.2);margin:0 auto 22px;display:grid;place-items:center;animation:pu 3s ease-in-out infinite}.ob .lo::before{content:"";width:34px;height:34px;border-radius:50%;border:8px solid #fff}@keyframes pu{50%{transform:scale(1.08)}}
.bs{position:absolute;inset:auto 0 0 0;z-index:8;background:#fff;border-radius:28px 28px 0 0;padding:22px 20px 26px;transform:translateY(105%);transition:transform .45s cubic-bezier(.22,.8,.26,1);box-shadow:0 -30px 60px rgba(26,18,48,.25)}.bs.o{transform:none}
.bs h3{font-size:20px;margin-bottom:12px}.bs .k-f button.op{height:48px;border-radius:14px;border:1.5px solid #E7E1F5;font-weight:700;text-align:left;padding:0 14px}
.k-toasts{bottom:auto;top:20px}
@media(max-width:480px){body{padding:0;place-items:stretch}.ph{width:100%;height:100vh;border-radius:0;padding:0;box-shadow:none}.ph::before{display:none}.sc{border-radius:0}.pg{padding-top:28px}}`;
function mobRun(){
  let on=0,tab=0,A=[["Morning run","5.2 km · 32 min","#EC4899","#FF7A18"],["Team standup","30 min","#3B82F6","#22D3EE"],["Strength session","45 min","#A855F7","#3B82F6"]],N=[["Goal reached","You hit 8,000 steps before noon"],["Weekly report ready","Activity is up 12% on last week"],["Friend request","Sana Ali wants to connect"]],S={Reminders:1,"Weekly report":1,"Share activity":0};
  h(`<div class="ph"><div class="sc" id="sc"></div></div>`);
  const T=["Home","Activity","Alerts","Profile"],rows=()=>A.map((a,i)=>`<div class="rw" style="--x:${a[2]};--y:${a[3]};animation-delay:${i*60}ms"><i></i><div><b>${a[0]}</b><small>${a[1]}</small></div></div>`).join("");
  function R(){const sc=$("#sc");if(!on){sc.innerHTML=`<div class="ob"><div><div class="lo"></div><h1>Pulse</h1><p>Your day, your goals, one calm screen.</p><button id="go">Get started</button></div></div>`;return}
    const B=[`<small>Tuesday</small><h2>Good morning,<br>Uzair</h2><div class="hc"><div class="rg"><svg width="104" height="104"><circle cx="52" cy="52" r="42" stroke="rgba(255,255,255,.28)"/><circle class="fg" cx="52" cy="52" r="42"/></svg><b>72%</b></div><div><small>Steps today</small><strong id="stp">0</strong><small>Goal 11,500</small></div></div><div class="tl2"><div><small>Calories</small><b>1,840</b></div><div><small>Sleep</small><b>7h 20m</b></div></div><div class="sh"><b>Today</b><button id="ad">+ Add</button></div>${rows()}`,
     `<h2>Activity</h2><small>This week</small><div class="br">${[["M",60],["T",82],["W",45],["T",90],["F",70],["S",30],["S",55]].map(d=>`<span><i data-h="${d[1]}"></i>${d[0]}</span>`).join("")}</div><div class="sh"><b>Sessions</b><button id="ad">+ Add</button></div>${rows()}`,
     `<h2>Alerts</h2><small>${N.length} new</small><div style="height:16px"></div>${N.map((n,i)=>`<div class="rw" style="--x:#A855F7;--y:#EC4899;animation-delay:${i*60}ms"><i></i><div><b>${n[0]}</b><small>${n[1]}</small></div><button data-dn="${i}" aria-label="Dismiss">×</button></div>`).join("")||`<div class="rw"><div><b>All caught up</b><small>New alerts appear here.</small></div></div>`}`,
     `<h2>Profile</h2><small>Premium plan</small><div class="hc" style="margin-bottom:20px">${ava("Uzair Ahmed",4,60)}<div><strong style="font-size:22px">Uzair Ahmed</strong><small>Member since 2024</small></div></div>${Object.keys(S).map(k=>`<div class="rw"><div><b>${k}</b></div><button class="sw ${S[k]?"on":""}" data-sw="${k}" role="switch" aria-checked="${!!S[k]}" aria-label="${k}"></button></div>`).join("")}<button class="k-g" id="so" style="width:100%;margin-top:10px">Sign out</button>`];
    sc.innerHTML=`<div class="pg">${B[tab]}</div><nav class="nv"><u style="transform:translateX(${tab*100}%)"></u>${T.map((t,i)=>`<button class="${i==tab?"on":""}" data-t="${i}">${t}</button>`).join("")}</nav><div class="bs" id="bs"><h3>Add activity</h3><div class="k-f">${[["Evening walk","2.1 km · 25 min"],["Yoga","20 min"],["Cycling","12 km · 40 min"]].map(o=>`<button class="op" data-na="${o[0]}|${o[1]}">${o[0]} <small style="color:#7A7391">· ${o[1]}</small></button>`).join("")}<button class="k-g" id="bx">Cancel</button></div></div>`;
    setTimeout(()=>{const f=$(".fg");if(f){f.style.strokeDashoffset=264*(1-.72);count($("#stp"),8420)}$$(".br i").forEach(i=>i.style.height=i.dataset.h+"%")},60)}
  R();document.addEventListener("click",e=>{const t=e.target;
    if(t.id=="go"){on=1;R()}if(t.dataset.t){tab=+t.dataset.t;R()}
    if(t.id=="ad")$("#bs").classList.add("o");if(t.id=="bx")$("#bs").classList.remove("o");
    if(t.closest("[data-na]")){const[a,b]=t.closest("[data-na]").dataset.na.split("|");A.unshift([a,b,"#10B981","#22D3EE"]);R();toast(a+" added")}
    if(t.dataset.dn){N.splice(+t.dataset.dn,1);R();toast("Alert dismissed")}
    if(t.dataset.sw){S[t.dataset.sw]=!S[t.dataset.sw];t.classList.toggle("on");t.setAttribute("aria-checked",!!S[t.dataset.sw]);toast(t.dataset.sw+(S[t.dataset.sw]?" on":" off"))}
    if(t.id=="so"){on=0;tab=0;R()}});
}

/* ---------------- brand identity (editorial) ---------------- */
const BRAND_CSS=`body{--bg:#FAF7F2;--tx:#14110F;--a1:#EC4899;--a2:#FF7A18}
.wr{max-width:1200px;margin:0 auto;padding:0 clamp(20px,5vw,64px)}
.cv{min-height:92vh;display:grid;align-content:space-between;padding:clamp(24px,4vw,48px) 0}
.mt{display:flex;justify-content:space-between;gap:20px;font-weight:700;font-size:13px}
.cv h1{font-size:clamp(64px,17vw,240px);line-height:.82;letter-spacing:-.07em;font-weight:800;margin:6vh 0 4vh}
.cv h1 span{background:linear-gradient(110deg,#EC4899,#7C3AED 50%,#FF7A18);-webkit-background-clip:text;background-clip:text;color:transparent}
.cv p{font-size:clamp(18px,2.2vw,28px);line-height:1.3;max-width:26ch;letter-spacing:-.02em}
.bl{background:linear-gradient(120deg,#EC4899,#FF7A18);height:clamp(320px,62vh,620px);display:grid;place-items:center;color:#fff;transition:background .5s,color .5s}
.bl svg{width:clamp(180px,34vw,420px);transition:transform .6s cubic-bezier(.22,.8,.26,1)}
.sx{padding:clamp(70px,11vw,150px) 0}
.sx h2{font-size:clamp(40px,7vw,96px);line-height:.92;letter-spacing:-.055em;font-weight:800;margin-bottom:clamp(28px,5vw,60px);max-width:11ch}
.sx h2+p,.two p{font-size:18px;line-height:1.55;max-width:48ch;color:#5E554D}
.two{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,80px);align-items:end}
.vr{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
.vr button{aspect-ratio:1.3;border-radius:18px;border:1.5px solid #E6DED2;display:grid;place-items:center;gap:6px;align-content:center;font-weight:700;font-size:13px;background:#fff;transition:.3s}.vr button svg{width:44%}.vr button.on{border-color:#14110F;box-shadow:0 20px 40px -24px rgba(20,17,15,.6);transform:translateY(-4px)}
.pl{display:grid;grid-template-columns:2fr 1.4fr 1fr 1fr 1fr;height:clamp(260px,46vh,440px)}
.pl button{display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;padding:20px;text-align:left;font-weight:700;transition:flex .4s,filter .3s}.pl button:hover{filter:brightness(1.08)}.pl small{display:block;opacity:.8;font-weight:600}
.ty{display:grid;grid-template-columns:auto 1fr;gap:clamp(24px,6vw,90px);align-items:center}
.ty b{font-size:clamp(140px,26vw,360px);line-height:.8;letter-spacing:-.08em;font-weight:800}
.ty div p{font-size:clamp(22px,3.4vw,44px);line-height:1.1;letter-spacing:-.035em;font-weight:800;margin-bottom:18px}.ty small{font-size:15px;color:#5E554D;line-height:1.6;display:block;max-width:44ch}
.hs{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 clamp(20px,5vw,64px) 30px;scrollbar-width:thin}
.mk{flex:0 0 min(78vw,520px);height:360px;border-radius:26px;scroll-snap-align:center;display:grid;place-items:center;position:relative;overflow:hidden;cursor:pointer;transition:transform .4s}.mk:hover{transform:scale(.985)}
.mk small{position:absolute;left:20px;bottom:16px;font-weight:700;font-size:13px}
.bz{width:260px;height:150px;border-radius:14px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 30px 50px -20px rgba(0,0,0,.45);transform:rotate(-7deg);font-weight:700}.bz svg{width:38px}
.lt{width:200px;height:270px;background:#fff;border-radius:6px;padding:22px;box-shadow:0 30px 50px -20px rgba(0,0,0,.35);transform:rotate(4deg)}.lt svg{width:30px;color:#EC4899}.lt i{display:block;height:5px;border-radius:5px;background:#E6DED2;margin-top:10px}
.ai{width:150px;height:150px;border-radius:38px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#EC4899,#FF7A18);box-shadow:0 34px 50px -18px rgba(236,72,153,.7)}.ai svg{width:56%}
.sg{font-size:68px;font-weight:800;letter-spacing:-.06em;color:#fff;display:flex;gap:14px;align-items:center}.sg svg{width:64px}
.gl{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:2px solid #14110F}
.gl div{padding:24px 24px 24px 0;border-bottom:1px solid #E6DED2}.gl b{font-size:22px;letter-spacing:-.02em;display:block;margin-bottom:6px}.gl span{color:#5E554D}
footer{padding:40px 0 60px;font-weight:700;font-size:13px;display:flex;justify-content:space-between}
@media(max-width:720px){.two,.ty{grid-template-columns:1fr}.vr{grid-template-columns:1fr 1fr}.pl{grid-template-columns:1fr;height:auto}.pl button{min-height:90px}.gl{grid-template-columns:1fr}}`;
function brandRun(d){
  const M=`<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="9"><circle cx="50" cy="50" r="40"/><path d="M50 10c-22 22-22 58 0 80M50 10c22 22 22 58 0 80" stroke-width="7"/></svg>`;
  const V=[["Primary","linear-gradient(120deg,#EC4899,#FF7A18)","#fff"],["Ink","#14110F","#FAF7F2"],["Paper","#F1EAE0","#14110F"],["Violet","linear-gradient(120deg,#7C3AED,#EC4899)","#fff"]];
  const PL=[["Rose","#EC4899","#fff"],["Ember","#FF7A18","#fff"],["Violet","#7C3AED","#fff"],["Ink","#14110F","#FAF7F2"],["Paper","#F1EAE0","#14110F"]];
  h(`<div class="wr cv"><div class="mt"><span>Meridian</span><span>${d.t}</span><span>Case study 2026</span></div><div><h1>Meri<span>dian</span></h1><p>A complete identity for a company that connects places, people and ideas.</p></div></div>
  <div class="bl" id="bl">${M}</div>
  <div class="wr sx"><div class="two"><h2>One mark. Every surface.</h2><p>The meridian line becomes a symbol: one circle, two arcs. Choose a version to see it on the hero block above.</p></div><div class="vr" id="vr">${V.map((v,i)=>`<button data-v="${i}" class="${i?"":"on"}" style="background:${v[1]};color:${v[2]}">${M}${v[0]}</button>`).join("")}</div></div>
  <div class="pl">${PL.map(p=>`<button data-hx="${p[1]}" style="background:${p[1]};color:${p[2]}" aria-label="Copy ${p[0]} ${p[1]}">${p[0]}<small>${p[1]}</small></button>`).join("")}</div>
  <div class="wr sx"><div class="ty"><b>Aa</b><div><p>Plus Jakarta Sans, set tight and heavy for headlines.</p><small>Display uses ExtraBold at minus five percent tracking. Body copy uses Medium at 1.6 line height. Numbers are always tabular in tables and prices.</small></div></div></div>
  <div class="hs" id="hs">
   <div class="mk" data-m="Business card" style="background:#14110F;color:#FAF7F2"><div class="bz" style="background:linear-gradient(120deg,#EC4899,#FF7A18);color:#fff">${M}<span>Alex Morgan<br><small style="position:static;opacity:.85">Chief Executive</small></span></div><small>Business card</small></div>
   <div class="mk" data-m="Letterhead" style="background:#F1EAE0"><div class="lt">${M}<i style="margin-top:26px;width:60%"></i><i></i><i></i><i style="width:80%"></i><i></i><i style="width:40%"></i></div><small>Letterhead</small></div>
   <div class="mk" data-m="App icon" style="background:#7C3AED;color:#fff"><div class="ai">${M}</div><small>App icon</small></div>
   <div class="mk" data-m="Signage" style="background:linear-gradient(120deg,#FF7A18,#EC4899)"><div class="sg">${M}Meridian</div><small style="color:#fff">Signage</small></div>
   <div class="mk" data-m="Social post" style="background:#14110F;color:#FAF7F2"><div style="font-size:54px;font-weight:800;letter-spacing:-.05em;line-height:.95;text-align:center">Every line<br><span style="color:#EC4899">connects.</span></div><small>Social post</small></div>
  </div>
  <div class="wr sx" style="padding-top:60px"><h2>Rules that keep it sharp.</h2><div class="gl"><div><b>Clear space</b><span>Half the mark’s height on every side.</span></div><div><b>Minimum size</b><span>24 pixels on screen, 10 millimetres in print.</span></div><div><b>Never</b><span>Stretch, outline or recolour the mark.</span></div></div><footer><span>Meridian identity</span><span>Demo by PlayBeat Digital</span></footer></div>`);
  document.addEventListener("click",e=>{const t=e.target.closest("button,[data-m]");if(!t)return;
    if(t.dataset.v){const v=V[t.dataset.v],b=$("#bl");b.style.background=v[1];b.style.color=v[2];$$("#vr button").forEach(x=>x.classList.toggle("on",x==t));b.firstElementChild.style.transform="scale(1.06) rotate("+t.dataset.v*90+"deg)";toast(v[0]+" version")}
    if(t.dataset.hx){navigator.clipboard&&navigator.clipboard.writeText(t.dataset.hx).catch(()=>{});toast("Copied "+t.dataset.hx)}
    if(t.dataset.m)modal(`<h3>${t.dataset.m}</h3><p>Delivered as print-ready and screen-ready files, with the template so your team can make more.</p><button class="k-b" data-close>Close</button>`)});
}

/* ---------------- illustration gallery ---------------- */
const GAL_CSS=`body{--bg:#FFFDF8;--tx:#16121F;--a1:#FBBF24;--a2:#EC4899}
.wr{max-width:1240px;margin:0 auto;padding:clamp(24px,4vw,48px) clamp(16px,4vw,40px) 60px}
h1{font-size:clamp(38px,7vw,84px);letter-spacing:-.055em;line-height:.95;font-weight:800;max-width:12ch}
.fl{display:flex;gap:8px;flex-wrap:wrap;margin:26px 0}.fl button{height:42px;padding:0 18px;border-radius:99px;border:1.5px solid #E9E2D3;font-weight:700;background:#fff;transition:.2s}.fl button.on{background:#16121F;color:#fff;border-color:#16121F}
.ms{columns:3 260px;column-gap:18px}
.it{position:relative;break-inside:avoid;margin-bottom:18px;border-radius:22px;overflow:hidden;animation:up .5s both}@keyframes up{from{opacity:0;transform:translateY(16px) scale(.98)}}
.it svg{display:block;width:100%;height:auto;transition:transform .7s cubic-bezier(.22,.8,.26,1)}.it:hover svg,.it:focus-within svg{transform:scale(1.05)}
.ov{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:10px;padding:16px;background:linear-gradient(transparent 40%,rgba(22,18,31,.78));color:#fff;opacity:0;transition:opacity .3s}
.it:hover .ov,.it:focus-within .ov{opacity:1}.ov b{font-size:17px}
.ov div{display:flex;gap:6px;flex-wrap:wrap}.ov button{height:36px;padding:0 13px;border-radius:99px;background:#fff;color:#16121F;font-weight:800;font-size:12.5px}.ov button+button{background:rgba(255,255,255,.2);color:#fff;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
@media(hover:none){.ov{opacity:1}}
.k-modal.big{width:min(760px,100%);padding:14px}.k-modal svg{width:100%;height:auto;border-radius:14px;display:block}`;
function galRun(d){
  const PAL=[["#FBBF24","#EC4899","#7C3AED"],["#22D3EE","#3B82F6","#1E3A8A"],["#FF7A18","#EC4899","#FDE68A"],["#10B981","#22D3EE","#064E3B"],["#A855F7","#EC4899","#FDF2F8"]],K=["Scenes","Characters","Isometric","Abstract","Botanical"],N=["Golden hour","The courier","Stacked city","Orbit study","Monstera","Night harbour","Friendly bot","Data blocks","Soft collision","Fern study","Dune road","The barista"];
  function art(i){const k=i%5,p=PAL[(i*3+1)%5],hh=[300,380,320,280,400][(i*2)%5],b=`<svg viewBox="0 0 300 ${hh}"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs><rect width="300" height="${hh}" fill="url(#g${i})"/>`;
    const s=[`<circle cx="210" cy="${hh*.3}" r="46" fill="#fff" opacity=".85"/><path d="M0 ${hh*.62}Q80 ${hh*.44} 160 ${hh*.6}T300 ${hh*.52}V${hh}H0Z" fill="${p[2]}" opacity=".55"/><path d="M0 ${hh*.78}Q100 ${hh*.62} 190 ${hh*.76}T300 ${hh*.7}V${hh}H0Z" fill="${p[2]}"/>`,
     `<path d="M70 ${hh}Q150 ${hh*.48} 230 ${hh}Z" fill="${p[2]}"/><circle cx="150" cy="${hh*.4}" r="62" fill="#fff"/><circle cx="128" cy="${hh*.38}" r="7" fill="#16121F"/><circle cx="172" cy="${hh*.38}" r="7" fill="#16121F"/><path d="M132 ${hh*.47}q18 16 36 0" stroke="#16121F" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="150" cy="${hh*.4-70}" r="12" fill="${p[2]}"/>`,
     [0,1,2].map(j=>{const x=90+j*45,y=hh*.62-j*hh*.14;return`<path d="M${x} ${y}l60-30 60 30-60 30z" fill="#fff" opacity=".95"/><path d="M${x} ${y}v56l60 30v-56z" fill="${p[2]}"/><path d="M${x+120} ${y}v56l-60 30v-56z" fill="${p[2]}" opacity=".6"/>`}).join(""),
     `<circle cx="110" cy="${hh*.42}" r="78" fill="#fff" opacity=".3"/><circle cx="190" cy="${hh*.58}" r="92" fill="${p[2]}" opacity=".55"/><circle cx="150" cy="${hh*.5}" r="120" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 12"/><circle cx="236" cy="${hh*.3}" r="14" fill="#fff"/>`,
     [-50,-18,14,46].map((a,j)=>`<path d="M150 ${hh*.94}Q${150+a*2.4} ${hh*.6} ${150+a*3} ${hh*(.24+j%2*.1)}Q${150+a*.6} ${hh*.52} 150 ${hh*.94}Z" fill="${j%2?"#fff":p[2]}" opacity="${j%2?.85:1}"/>`).join("")+`<rect x="118" y="${hh*.86}" width="64" height="${hh*.14}" rx="8" fill="#16121F"/>`][k];
    return b+s+"</svg>"}
  const A=N.map((n,i)=>[n,K[i%5],i]);let f="All";
  h(`<div class="wr"><h1>${d.t}, made to order.</h1><div class="fl" id="fl">${["All"].concat(K).map(k=>`<button data-f="${k}" class="${k=="All"?"on":""}">${k}</button>`).join("")}</div><div class="ms" id="ms"></div></div>`);
  function R(){$("#ms").innerHTML=A.filter(a=>f=="All"||a[1]==f).map((a,j)=>`<figure class="it" style="animation-delay:${j*50}ms" tabindex="0">${art(a[2])}<figcaption class="ov"><b>${a[0]}</b><div><button data-z="${a[2]}">Zoom</button><button data-vw="${a[2]}">View</button><button data-op="${a[2]}">Open project</button></div></figcaption></figure>`).join("")}
  R();document.addEventListener("click",e=>{const t=e.target,M=$(".k-modal");
    if(t.dataset.f){f=t.dataset.f;$$("#fl button").forEach(b=>b.classList.toggle("on",b==t));R()}
    if(t.dataset.z){M.classList.add("big");modal(art(+t.dataset.z))}
    if(t.dataset.vw){const a=A[t.dataset.vw];drawer(`<h3>${a[0]}</h3><p>${a[1]} illustration</p>${art(a[2])}<div class="k-dl"><div><span>Format</span><b>Vector, SVG and AI</b></div><div><span>Licence</span><b>Commercial</b></div><div><span>Turnaround</span><b>4 to 7 days</b></div></div>`)}
    if(t.dataset.op){const a=A[t.dataset.op];M.classList.remove("big");modal(`<h3>${a[0]}</h3><p>Part of a ${a[1].toLowerCase()} series. Request the same style for your brand and we will send three sketches first.</p><button class="k-b" id="rq">Request this style</button>`)}
    if(t.id=="rq"){shut();toast("Style request sent (demo mode)")}});
}

/* ---------------- corporate website / landing page ---------------- */
const SITE_CSS=`body{--bg:#fff;--tx:#0B1220;--a1:#3B82F6;--a2:#22D3EE}html{scroll-behavior:smooth;scroll-padding-top:80px}
.wr{max-width:1160px;margin:0 auto;padding:0 clamp(18px,4vw,40px)}
.nv{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border-bottom:1px solid #EEF2F7}
.nv .wr{display:flex;align-items:center;gap:6px;height:68px}.nv b{font-size:19px;font-weight:800;letter-spacing:-.03em;margin-right:auto;display:flex;gap:9px;align-items:center}.nv b i{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#3B82F6,#22D3EE)}
.nv a{padding:9px 13px;border-radius:10px;font-weight:600;color:#475569;text-decoration:none;position:relative}.nv a.on,.nv a:hover{color:#0B1220}.nv a::after{content:"";position:absolute;left:13px;right:13px;bottom:3px;height:2px;border-radius:2px;background:linear-gradient(90deg,#3B82F6,#22D3EE);transform:scaleX(0);transition:transform .35s cubic-bezier(.22,.8,.26,1)}.nv a.on::after{transform:scaleX(1)}
.cta{height:44px;padding:0 20px;border-radius:12px;background:#0B1220;color:#fff;font-weight:700;transition:transform .25s}.cta:hover{transform:translateY(-2px)}.cta.g{background:linear-gradient(110deg,#3B82F6,#22D3EE)}.cta.o{background:#fff;color:#0B1220;border:1.5px solid #E2E8F0}
.mb{display:none;width:42px;height:42px;border-radius:11px;border:1px solid #E2E8F0;font-size:17px}
.hr{padding:clamp(48px,8vw,100px) 0;background:radial-gradient(50% 70% at 90% 10%,rgba(34,211,238,.18),transparent 70%),radial-gradient(40% 60% at 0% 100%,rgba(59,130,246,.14),transparent 70%)}
.hr .wr{display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:center}
.hr h1{font-size:clamp(38px,6vw,72px);line-height:.98;letter-spacing:-.045em;font-weight:800}
.hr p{font-size:18px;color:#475569;margin:20px 0 28px;max-width:46ch}.hr .bt{display:flex;gap:10px;flex-wrap:wrap}
.vz{position:relative;height:380px}.vz i{position:absolute;border-radius:28px}
.vz i:nth-child(1){inset:8% 6% 10% 14%;background:linear-gradient(140deg,#3B82F6,#22D3EE);transform:rotate(4deg);box-shadow:0 40px 70px -30px #3B82F6}
.vz i:nth-child(2){inset:22% 28% 0 0;background:#0B1220;transform:rotate(-5deg)}
.vz div{position:absolute;background:#fff;border-radius:18px;padding:14px 18px;box-shadow:0 24px 50px -20px rgba(8,20,38,.4);font-weight:700;animation:fl 7s ease-in-out infinite}@keyframes fl{50%{transform:translateY(-10px)}}
.vz div small{display:block;color:#64748B;font-weight:600;font-size:12px}.vz div b{font-size:26px;letter-spacing:-.03em}
.sx{padding:clamp(56px,8vw,96px) 0}.sx.t{background:#F4F7FB}
.sx h2{font-size:clamp(30px,4.4vw,52px);letter-spacing:-.04em;line-height:1;font-weight:800;margin-bottom:12px;max-width:16ch}.sx h2+p{color:#475569;font-size:17px;max-width:54ch;margin-bottom:34px}
.st{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.st b{display:block;font-size:clamp(34px,5vw,60px);letter-spacing:-.05em;font-weight:800;line-height:1;background:linear-gradient(110deg,#3B82F6,#22D3EE);-webkit-background-clip:text;background-clip:text;color:transparent}.st span{color:#475569;font-weight:600}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.cd{background:#fff;border:1px solid #E5EAF2;border-radius:22px;padding:24px;transition:transform .35s cubic-bezier(.22,.8,.26,1),box-shadow .35s,border-color .3s}.cd:hover{transform:translateY(-5px);box-shadow:0 30px 50px -30px rgba(59,130,246,.6);border-color:#93C5FD}
.cd i{display:block;width:46px;height:46px;border-radius:14px;margin-bottom:16px}.cd h3{font-size:20px;letter-spacing:-.02em;margin-bottom:6px}.cd p{color:#475569}
.tb{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}.tb button{height:40px;padding:0 16px;border-radius:99px;border:1.5px solid #E2E8F0;font-weight:700;background:#fff}.tb button.on{background:#0B1220;color:#fff;border-color:#0B1220}
.wk{border-radius:22px;overflow:hidden;background:#fff;border:1px solid #E5EAF2;cursor:pointer;transition:transform .35s,opacity .3s}.wk:hover{transform:translateY(-5px)}.wk div{height:190px}.wk h3{font-size:18px;padding:16px 18px 2px}.wk p{padding:0 18px 18px;color:#475569}
.pr{text-align:left}.pr b{font-size:38px;letter-spacing:-.04em;display:block;margin:6px 0 10px}.pr.p{border:2px solid transparent;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(110deg,#3B82F6,#22D3EE) border-box;box-shadow:0 30px 60px -34px #3B82F6}.pr .cta{width:100%;margin-top:16px}
details{border-bottom:1px solid #E5EAF2;padding:4px 0}summary{cursor:pointer;font-weight:700;font-size:18px;padding:16px 0;list-style:none;display:flex;justify-content:space-between}summary::after{content:"+";font-size:22px;color:#64748B}details[open] summary::after{content:"−"}details p{color:#475569;padding-bottom:16px}
.cn{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}.cn .k-f input,.cn textarea{background:#fff}.cn textarea{border-radius:12px;border:1px solid #E2E8F0;padding:12px;min-height:110px;width:100%}
.bd{background:linear-gradient(120deg,#1E3A8A,#3B82F6 60%,#22D3EE);color:#fff;border-radius:30px;padding:clamp(30px,6vw,64px);text-align:center}.bd h2{margin:0 auto 12px;max-width:none}.bd .cta{background:#fff;color:#0B1220;margin-top:14px}
footer{padding:30px 0;color:#64748B;font-size:13px;border-top:1px solid #EEF2F7;text-align:center}
@media(max-width:820px){.hr .wr,.cn{grid-template-columns:1fr}.vz{height:260px}.g3{grid-template-columns:1fr}.st{grid-template-columns:1fr 1fr}.nv a{display:none}.nv.o a{display:block}.nv.o .wr{height:auto;flex-wrap:wrap;padding-top:13px;padding-bottom:12px}.nv.o a{flex:1 1 100%;order:5}.mb{display:block}.nv .cta{display:none}}`;
function siteRun(d){
  const L=d.land,SV=[["Strategy","A plan grounded in your market and your numbers.","#3B82F6"],["Design","Interfaces people understand the first time.","#22D3EE"],["Engineering","Fast, secure builds that are easy to maintain.","#7C3AED"],["Growth","Experiments that move conversion, not vanity metrics.","#10B981"],["Security","Reviews, monitoring and sensible defaults.","#FF7A18"],["Cloud","Hosting that scales without surprise bills.","#EC4899"]];
  const WK=[["Fintech platform","Web","#3B82F6","#22D3EE"],["Retail rebrand","Brand","#EC4899","#FF7A18"],["Clinic booking app","Apps","#10B981","#22D3EE"],["Logistics portal","Web","#FF7A18","#FBBF24"],["Analytics dashboard","Apps","#7C3AED","#3B82F6"],["Hotel identity","Brand","#A855F7","#EC4899"]];
  const nav=L?[["Benefits","sv"],["Pricing","pr"],["FAQ","fq"],["Contact","ct"]]:[["Services","sv"],["Work","wk"],["FAQ","fq"],["Contact","ct"]];
  h(`<nav class="nv" id="nv"><div class="wr"><b><i></i>Meridian</b>${nav.map(n=>`<a href="#${n[1]}" data-go="${n[1]}">${n[0]}</a>`).join("")}<button class="cta" data-go="ct">${L?"Start free trial":"Book a call"}</button><button class="mb" id="mb" aria-label="Open menu">☰</button></div></nav>
  <header class="hr"><div class="wr"><div><h1>${L?"Launch your product page in seven days.":"Advice and delivery for companies planning decades ahead."}</h1><p>${L?"One focused page with a clear promise, real proof and a single call to action. Built to load fast and convert.":"Meridian is a demo company. This site shows the structure, motion and polish of a "+d.t.toLowerCase()+" by PlayBeat Digital."}</p><div class="bt"><button class="cta g" data-go="ct">${L?"Start free trial":"Book a call"}</button><button class="cta o" data-go="${L?"pr":"wk"}">${L?"See pricing":"View our work"}</button></div></div>
   <div class="vz"><i></i><i></i><div style="left:4%;top:8%"><small>Conversion</small><b>+38%</b></div><div style="right:2%;bottom:12%;animation-delay:-3s"><small>Page speed</small><b>0.9s</b></div></div></div></header>
  <section class="sx" style="padding-bottom:0"><div class="wr st">${[[120,"+","Projects delivered"],[98,"%","Client retention"],[12,"","Industries"],[24,"/7","Support"]].map(s=>`<div><b data-n="${s[0]}" data-s="${s[1]}">0</b><span>${s[2]}</span></div>`).join("")}</div></section>
  <section class="sx" id="sv"><div class="wr"><h2>${L?"Why it works":"What we do"}</h2><p>${L?"Everything on the page earns its place.":"Six disciplines under one roof, so nothing gets lost between teams."}</p><div class="g3">${SV.map(s=>`<div class="cd"><i style="background:linear-gradient(135deg,${s[2]},${s[2]}99)"></i><h3>${s[0]}</h3><p>${s[1]}</p></div>`).join("")}</div></div></section>
  ${L?`<section class="sx t" id="pr"><div class="wr"><h2>Simple pricing</h2><p>Pick a plan now and change it whenever you need to.</p><div class="g3">${[["Starter","Rs 45k","Design, build and analytics"],["Growth","Rs 80k","Adds A/B testing and CMS"],["Scale","Custom","Multiple pages and integrations"]].map((p,i)=>`<div class="cd pr ${i==1?"p":""}"><h3>${p[0]}</h3><b>${p[1]}</b><p>${p[2]}</p><button class="cta ${i==1?"g":"o"}" data-pl="${p[0]}">Choose ${p[0]}</button></div>`).join("")}</div></div></section>`
   :`<section class="sx t" id="wk"><div class="wr"><h2>Selected work</h2><p>Filter by type, then open a project.</p><div class="tb" id="tb">${["All","Web","Brand","Apps"].map((t,i)=>`<button data-f="${t}" class="${i?"":"on"}">${t}</button>`).join("")}</div><div class="g3" id="wg">${WK.map((w,i)=>`<article class="wk" data-k="${w[1]}" data-w="${i}" tabindex="0"><div style="background:radial-gradient(circle at 75% 25%,rgba(255,255,255,.55),transparent 40%),linear-gradient(135deg,${w[2]},${w[3]})"></div><h3>${w[0]}</h3><p>${w[1]} · +${30+i*9}% growth</p></article>`).join("")}</div></div></section>`}
  <section class="sx" id="fq"><div class="wr" style="max-width:820px"><h2>Questions</h2><p>Short answers to what people ask first.</p>${[["How long does it take?",L?"Most pages launch in 7 to 10 days.":"A typical engagement runs 3 to 6 weeks."],["Can we edit it ourselves?","Yes. Content is managed through a simple CMS."],["Is it mobile ready?","Every layout is designed for phones first."]].map(f=>`<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join("")}</div></section>
  <section class="sx t" id="ct"><div class="wr cn"><div><h2>Tell us about your project.</h2><p>We reply within one working day.</p></div><div class="k-f"><label>Full name<input id="nm" autocomplete="name"></label><label>Email<input id="em" type="email" autocomplete="email"></label><label>Project details<textarea id="ms"></textarea></label><div class="k-e" id="er"></div><button class="cta g" id="sn">Send message</button></div></div></section>
  <footer><div class="wr">Meridian is a fictional company used for this demo. Built by PlayBeat Digital.</div></footer>`);
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);count(e.target,+e.target.dataset.n,"",e.target.dataset.s)}}));$$("[data-n]").forEach(e=>io.observe(e));
  const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)$$(".nv a").forEach(a=>a.classList.toggle("on",a.dataset.go==e.target.id))}),{rootMargin:"-40% 0px -55% 0px"});$$("section[id]").forEach(s=>so.observe(s));
  document.addEventListener("click",e=>{const t=e.target,g=t.closest("[data-go]"),w=t.closest("[data-w]");
    if(g){e.preventDefault();$("#nv").classList.remove("o");$("#"+g.dataset.go).scrollIntoView({behavior:"smooth"})}
    if(t.id=="mb")$("#nv").classList.toggle("o");
    if(t.dataset.f){$$("#tb button").forEach(b=>b.classList.toggle("on",b==t));$$(".wk").forEach(c=>c.style.display=t.dataset.f=="All"||c.dataset.k==t.dataset.f?"":"none")}
    if(w){const x=WK[w.dataset.w];modal(`<div style="height:170px;border-radius:14px;margin-bottom:14px;background:linear-gradient(135deg,${x[2]},${x[3]})"></div><h3>${x[0]}</h3><p>${x[1]} project. A case study page would cover the brief, the approach and the measured results.</p><button class="k-b" data-close>Close</button>`)}
    if(t.dataset.pl)toast(t.dataset.pl+" plan selected");
    if(t.id=="sn"){const n=$("#nm").value.trim(),m=$("#em").value.trim(),er=$("#er");if(n.length<2){er.textContent="Enter your full name.";$("#nm").focus();return}if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)){er.textContent="Enter an email address like name@company.com.";$("#em").focus();return}er.textContent="";$("#nm").value=$("#em").value=$("#ms").value="";toast("Message sent. We will reply shortly.")}});
}

/* ---------------- template mapper ---------------- */
function tpl(s){const m=s.m;
  return doc(m=="ill"?{css:GAL_CSS,run:galRun,data:{t:s.t}}:DASH[m]?{css:DASH_CSS,run:dashRun,data:DASH[m]}:m=="ai"?{css:AI_CSS,run:aiRun}:m=="crm"?{css:CRM_CSS,run:crmRun}:m=="store"?{css:STORE_CSS,run:storeRun}:m=="mob"?{css:MOB_CSS,run:mobRun}:m=="brand"?{css:BRAND_CSS,run:brandRun,data:{t:s.t}}:{css:SITE_CSS,run:siteRun,data:{t:s.t,land:/Landing|SaaS Website|Framer/.test(s.t)}})}


/* ==== PlayBeat Digital storefront adapter (izoko integration) ==== */
const PBSV={l:[],on(t,e,f,o){t.addEventListener(e,f,o);this.l.push([t,e,f,o]);return f},
  off(){this.l.forEach(x=>{try{x[0].removeEventListener(x[1],x[2],x[3])}catch(e){}});this.l=[]},
  go(p,r){try{if(window.location.pathname+window.location.search!==p){window.history[r?"replaceState":"pushState"]({},'',p)}window.dispatchEvent(new PopStateEvent("popstate"))}catch(e){}},
  post:async d=>{try{const res=await fetch((window.__pbsvApi||"")+"/api/service-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!res.ok)return false;const j=await res.json().catch(()=>null);return !!(j&&j.success!==false)}catch(e){return false}},
  svcMap:null};

/* "#/..." links -> real storefront routes */
const PBSV_ANCH=["solutions","process","live","work","industries","pricing"];
function mapHash(h){
  let q="";const qi=h.indexOf("?");if(qi>=0){q=h.slice(qi);h=h.slice(0,qi)}
  const seg=h.slice(2).split("/").filter(Boolean);
  if(!seg.length)return["/services",null];
  if(seg[0]==="services")return seg.length===1?["/services"+(q||"?view=catalog"),null]:["/services/package/"+seg.slice(1).join("/"),null];
  if(seg[0]==="demo")return["/services/demo/"+seg.slice(1).join("/"),null];
  if(seg[0]==="demos")return["/services/demos",null];
  if(seg[0]==="build")return["/services/build"+q,null];
  if(seg[0]==="company")return["/services/company",null];
  if(PBSV_ANCH.includes(seg[0]))return["/services",seg[0]];
  return null;
}

export function pbsvInit(){
  if(!window.__pbsvClick){
    window.__pbsvClick=true;
    PBSV.on(document,"click",e=>{
      if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      const a=(e.target instanceof Element)?e.target.closest('a[href^="#/"]'):null;
      if(!a)return;
      const m=mapHash(a.getAttribute("href")||"");
      if(!m)return;
      e.preventDefault();
      PBSV.go(m[0]);
      pbsvRoute();
      if(m[1])setTimeout(()=>{const el=document.getElementById(m[1]);if(el)el.scrollIntoView({behavior:"smooth"})},140);
    });
  }
  if(!window.__pbsvDone){window.__pbsvDone=true;init()}
}
export function pbsvRoute(){ if(window.__pbsvDone) route() }
export function pbsvSetPath(p){ window.__pbsvPath=p }
export function pbsvTeardown(){ PBSV.off(); document.body.classList.remove("has-bar"); document.documentElement.style.overflow=""; const s=document.getElementById("pbsv-style"); if(s&&s.parentNode)s.parentNode.removeChild(s); window.__pbsvDone=false }
export function pbsvSetApi(api){ window.__pbsvApi=api||"" }
export function pbsvSetSvcMap(m){ PBSV.svcMap=m||null }
