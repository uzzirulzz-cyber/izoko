
// Source data adapted from uzzirulzz-cyber/new331/src/data/servicesCatalog.ts.
// Images are omitted in the admin catalog; all catalog records and pricing are embedded here.
const heroEnterpriseStudio = ''
const showcaseLifestyleAtlas = ''
const showcaseOperationsCrm = ''
const showcaseAiEducation = ''

export type PackageLevel = 'Basic' | 'Professional' | 'Enterprise';

export type StorefrontCategory =
  | 'All'
  | 'Business Websites'
  | 'E-Commerce'
  | 'CRM & Automation'
  | 'Lead Generation'
  | 'Real Estate'
  | 'Education'
  | 'FinTech'
  | 'Admin Systems'
  | 'Custom Web Apps';

export interface ServiceProduct {
  id: string;
  category: string;
  storefrontGroup: Exclude<StorefrontCategory, 'All'>;
  name: string;
  shortDescription: string;
  recommendedPkr: number;
  optionalUsd: number;
  isStartingFrom: boolean;
  packageLevel: PackageLevel;
  deliveryTime: string;
  deliverables: string[];
  architectureStack: string;
  sourceBlueprint?: string;
  isFlagshipFeatured?: boolean;
  flagshipSummary?: string;
}

export interface FlagshipBlueprint {
  id: string;
  index: string;
  title: string;
  sourceDocument: string;
  category: string;
  recommendedPkr: number;
  optionalUsd: number;
  isStartingFrom: boolean;
  packageLevel: PackageLevel;
  deliveryTime: string;
  summary: string;
  evidenceCapabilities: string[];
  quantifiedOutcome: string;
  imageUrl?: string;
  serviceId: string;
}

export const HERO_IMAGE_URL = heroEnterpriseStudio;

export const STOREFRONT_CATEGORIES: StorefrontCategory[] = [
  'All',
  'Business Websites',
  'E-Commerce',
  'CRM & Automation',
  'Lead Generation',
  'Real Estate',
  'Education',
  'FinTech',
  'Admin Systems',
  'Custom Web Apps',
];

export const FEATURED_FLAGSHIP_SERVICES: FlagshipBlueprint[] = [
  {
    id: 'flagship-crm-automation',
    index: '01',
    title: 'Enterprise CRM & Automation',
    sourceDocument: 'PlayBeat Operations Terminal CRM Restricted Access.pdf',
    category: 'CRM & Automation',
    recommendedPkr: 449000,
    optionalUsd: 1620,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '4–6 Weeks',
    summary:
      'Leads, pipelines, customers, WhatsApp/email communication, campaigns, analytics, staff roles and automation.',
    evidenceCapabilities: [
      'CSV contact management & bulk segmentation',
      'Omnichannel WhatsApp + email campaign dispatch',
      'Multi-stage lead pipeline & conversion tracking',
      'Role-based staff access & executive analytics',
    ],
    quantifiedOutcome: '3.4x faster lead response time across 12-stage sales pipelines',
    imageUrl: showcaseOperationsCrm,
    serviceId: 'crm-omnichannel',
  },
  {
    id: 'flagship-ecommerce',
    index: '02',
    title: 'Premium E-Commerce Platform',
    sourceDocument: 'PlayBeat Digital Enterprise Admin Communication CRM.pdf',
    category: 'E-Commerce',
    recommendedPkr: 299000,
    optionalUsd: 1080,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–4 Weeks',
    summary:
      'Products, categories, checkout, payments, customer accounts, orders, admin CMS and analytics.',
    evidenceCapabilities: [
      'Multi-category digital & physical catalog architecture',
      'Integrated checkout, order verification & customer accounts',
      'Storefront CMS with real-time inventory & promotions',
      'Revenue telemetry & automated order notifications',
    ],
    quantifiedOutcome: '+68% checkout completion rate with unified storefront & admin CMS',
    serviceId: 'ecom-premium-platform',
  },
  {
    id: 'flagship-real-estate',
    index: '03',
    title: 'Real Estate Marketplace',
    sourceDocument: 'Lifestyle Atlas - Real Estate Property Portal Rawalpindi Islamabad.pdf',
    category: 'Real Estate',
    recommendedPkr: 499000,
    optionalUsd: 1790,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–6 Weeks',
    summary:
      'Property listings, agents, advanced search, maps, inquiry management, admin and lead capture.',
    evidenceCapabilities: [
      'Authenticated property listings & valuation workflows',
      'Interactive geographic map search (Rawalpindi / Islamabad model)',
      'Direct WhatsApp agent routing & scheduled site visits',
      'Dedicated agency & staff administration console',
    ],
    quantifiedOutcome: '+140% qualified property inquiries with interactive map search & agent routing',
    imageUrl: showcaseLifestyleAtlas,
    serviceId: 're-marketplace-maps',
  },
  {
    id: 'flagship-ai-learning',
    index: '04',
    title: 'AI Learning Platform',
    sourceDocument: 'University of Diverse Languages(1).pdf',
    category: 'Education',
    recommendedPkr: 499000,
    optionalUsd: 1790,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–6 Weeks',
    summary:
      'Courses, students, AI tutor, assessments, certificates, profiles and admin management.',
    evidenceCapabilities: [
      'Multilingual curriculum & interactive course modules',
      'AI conversation tutor & automated proficiency grading',
      'Proctored exam portal & verifiable digital certificates',
      'Student progression analytics & faculty dashboard',
    ],
    quantifiedOutcome: '92% course completion rate across multilingual certification tracks',
    imageUrl: showcaseAiEducation,
    serviceId: 'edu-ai-language',
  },
  {
    id: 'flagship-lead-intelligence',
    index: '05',
    title: 'Lead Intelligence Platform',
    sourceDocument: 'PlayBeat Lead Pulse Plus.pdf',
    category: 'Lead Generation',
    recommendedPkr: 549000,
    optionalUsd: 1980,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–7 Weeks',
    summary:
      'Lead discovery, verification, filtering, CRM pipeline, exports, campaigns and team access.',
    evidenceCapabilities: [
      'Automated extraction jobs & worker bot orchestration',
      'Multi-step email & phone verification pipelines',
      'High-density lead databases with custom filtering & CSV/API export',
      'Multi-seat team permissions & quota governance',
    ],
    quantifiedOutcome: '45,000+ verified B2B decision-maker records processed per campaign cycle',
    serviceId: 'lead-enterprise-pulse',
  },
  {
    id: 'flagship-custom-webapp',
    index: '06',
    title: 'Enterprise Custom Web App',
    sourceDocument: 'Premium Digital Marketplace Smart Projectors PlayBeat Digital.pdf',
    category: 'Custom Web Apps',
    recommendedPkr: 699000,
    optionalUsd: 2520,
    isStartingFrom: true,
    packageLevel: 'Enterprise',
    deliveryTime: '6–10 Weeks',
    summary:
      'Fully custom dashboards, portals, SaaS systems, workflow automation, APIs, databases, authentication and enterprise administration.',
    evidenceCapabilities: [
      'Custom relational database architecture & REST/GraphQL APIs',
      'Multi-tenant authentication, RBAC & audit logging',
      'Bespoke executive dashboards & automated background workers',
      'Dedicated cloud deployment, SLA documentation & handover',
    ],
    quantifiedOutcome: '99.95% production availability with full source ownership & RBAC security',
    serviceId: 'custom-enterprise-webapp',
  },
];

export const SERVICES_CATALOG: ServiceProduct[] = [
  // 1. Business Websites
  {
    id: 'bw-corporate',
    category: 'Business Websites',
    storefrontGroup: 'Business Websites',
    name: 'Premium Corporate Business Website',
    shortDescription:
      'High-authority corporate presence engineered for conversion, speed, and executive brand positioning with mobile-first responsive architecture.',
    recommendedPkr: 149000,
    optionalUsd: 540,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '10–14 Days',
    deliverables: [
      'Up to 8 custom-designed architectural pages',
      'Lead capture forms with instant WhatsApp & email routing',
      'Technical SEO schema, OpenGraph & Core Web Vitals optimization',
      'SSL configuration, deployment & 30-day technical support',
    ],
    architectureStack: 'React / Next.js · Tailwind CSS · Edge CDN',
  },
  {
    id: 'bw-enterprise-cms',
    category: 'Business Websites',
    storefrontGroup: 'Business Websites',
    name: 'Enterprise Company Website + Admin CMS',
    shortDescription:
      'Dynamic corporate platform paired with a custom content management console for publishing case studies, press releases, services, and career openings.',
    recommendedPkr: 249000,
    optionalUsd: 900,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '2–3 Weeks',
    deliverables: [
      'Custom Admin CMS for non-technical editorial publishing',
      'Dynamic service catalogs, case study portfolios & media library',
      'Role-based editor approvals & versioned content drafts',
      'Analytics dashboard & CRM webhook integration',
    ],
    architectureStack: 'Next.js · TypeScript · PostgreSQL · Custom Admin CMS',
  },
  {
    id: 'bw-custom-portal',
    category: 'Business Websites',
    storefrontGroup: 'Business Websites',
    name: 'Custom Multi-page Business Portal',
    shortDescription:
      'Comprehensive B2B client and partner portal featuring authenticated client areas, document vaults, service request tracking, and multi-department routing.',
    recommendedPkr: 299000,
    optionalUsd: 1080,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Authenticated client login & dedicated account workspaces',
      'Multi-department inquiry routing & SLA ticket tracking',
      'Secure document sharing, invoicing & proposal approvals',
      'Custom API integrations with internal ERP/CRM tools',
    ],
    architectureStack: 'React · Node.js · PostgreSQL · Role-Based Auth',
  },

  // 2. E-Commerce
  {
    id: 'ecom-premium-store',
    category: 'E-Commerce',
    storefrontGroup: 'E-Commerce',
    name: 'Premium E-Commerce Store',
    shortDescription:
      'Conversion-engineered retail storefront with variant catalogs, cart drawer, COD & card payment integration, and automated order status tracking.',
    recommendedPkr: 199000,
    optionalUsd: 720,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '2–3 Weeks',
    deliverables: [
      'High-speed product catalog with filtering & variant selection',
      'Cash on Delivery (COD) verification & local/international payment gateways',
      'Inventory management, coupon engine & order dispatch console',
      'Automated WhatsApp & email order receipts',
    ],
    architectureStack: 'React · Express · Relational Storefront DB',
    sourceBlueprint: 'Premium Digital Marketplace Smart Projectors PlayBeat Digital.pdf',
  },
  {
    id: 'ecom-digital-marketplace',
    category: 'E-Commerce',
    storefrontGroup: 'E-Commerce',
    name: 'Digital Products Marketplace',
    shortDescription:
      'Automated digital storefront built for software licenses, subscriptions, digital downloads, and premium service packages with instant fulfillment.',
    recommendedPkr: 275000,
    optionalUsd: 990,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Instant license/asset delivery & encrypted download links',
      'Subscription tier management & renewal notifications',
      'Unified product + services catalog architecture',
      'Customer wallet, order history & admin fulfillment console',
    ],
    architectureStack: 'TypeScript · Node.js · Secure Token Fulfillment',
    sourceBlueprint: 'Premium Digital Marketplace Smart Projectors PlayBeat Digital.pdf',
  },
  {
    id: 'ecom-premium-platform',
    category: 'E-Commerce',
    storefrontGroup: 'E-Commerce',
    name: 'Premium E-Commerce Platform (Products + Services + Admin CMS)',
    shortDescription:
      'Full-scale commercial platform combining physical products, digital goods, and high-ticket service tiers with customer accounts, checkout, and analytics.',
    recommendedPkr: 299000,
    optionalUsd: 1080,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Complete storefront with products, categories, checkout & payments',
      'Customer account portal with saved addresses & order tracking',
      'Executive Admin CMS for catalog, pricing & promotion control',
      'Real-time revenue, conversion & cohort analytics',
    ],
    architectureStack: 'React · Node.js · PostgreSQL · Admin Telemetry',
    sourceBlueprint: 'PlayBeat Digital Enterprise Admin Communication CRM.pdf',
    isFlagshipFeatured: true,
  },
  {
    id: 'ecom-multicategory-marketplace',
    category: 'E-Commerce',
    storefrontGroup: 'E-Commerce',
    name: 'Multi-category Marketplace + Admin',
    shortDescription:
      'Enterprise multi-vendor or multi-brand marketplace featuring vendor onboarding, commission ledgers, centralized moderation, and split payouts.',
    recommendedPkr: 399000,
    optionalUsd: 1440,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '4–6 Weeks',
    deliverables: [
      'Multi-vendor seller portals with independent inventory & analytics',
      'Master admin moderation, commission rules & payout ledger',
      'Advanced faceted search across thousands of SKUs',
      'Dispute resolution workflow & customer review verification',
    ],
    architectureStack: 'Next.js · Node.js · Multi-Tenant Ledger DB',
    sourceBlueprint: 'Premium Digital Marketplace Smart Projectors PlayBeat Digital.pdf',
  },

  // 3. CRM & Operations
  {
    id: 'crm-business-dashboard',
    category: 'CRM & Operations',
    storefrontGroup: 'CRM & Automation',
    name: 'Business CRM Dashboard',
    shortDescription:
      'Centralized client database, deal pipeline, activity logging, and follow-up scheduler designed to replace fragmented spreadsheets.',
    recommendedPkr: 225000,
    optionalUsd: 810,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '2–3 Weeks',
    deliverables: [
      'Contact & company directory with custom tags & CSV import/export',
      'Kanban & tabular deal stage pipelines',
      'Task reminders, call logs & staff assignment',
      'Monthly sales velocity & conversion reporting',
    ],
    architectureStack: 'React · TypeScript · REST API · PostgreSQL',
    sourceBlueprint: 'PlayBeat Operations Terminal CRM Restricted Access.pdf',
  },
  {
    id: 'crm-sales-leads',
    category: 'CRM & Operations',
    storefrontGroup: 'CRM & Automation',
    name: 'Sales + Leads CRM',
    shortDescription:
      'High-velocity sales execution system featuring automated lead assignment, quotation generation, stage progression metrics, and rep leaderboards.',
    recommendedPkr: 299000,
    optionalUsd: 1080,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Automated inbound lead capture from web forms & social ads',
      'Round-robin or territory-based sales rep assignment',
      'Integrated PDF proposal/quote generator & deal value tracking',
      'Rep performance analytics & pipeline forecasting',
    ],
    architectureStack: 'React · Node.js · PostgreSQL · Automated Webhooks',
    sourceBlueprint: 'PlayBeat Operations Terminal CRM Restricted Access.pdf',
  },
  {
    id: 'crm-omnichannel',
    category: 'CRM & Operations',
    storefrontGroup: 'CRM & Automation',
    name: 'Omnichannel CRM — Email + WhatsApp + Leads',
    shortDescription:
      'Flagship operations CRM uniting CSV contact management, bulk & triggered email/WhatsApp communication, pipeline automation, and conversion tracking.',
    recommendedPkr: 449000,
    optionalUsd: 1620,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '4–6 Weeks',
    deliverables: [
      'Unified inbox & campaign engine for WhatsApp and Email outreach',
      'CSV contact ingestion, deduplication & dynamic list segmentation',
      'Multi-stage lead pipeline with automated follow-up triggers',
      'Staff role permissions, audit trails & conversion attribution',
    ],
    architectureStack: 'React · Node.js · WhatsApp/SMTP Engines · RBAC',
    sourceBlueprint: 'PlayBeat Operations Terminal CRM Restricted Access.pdf',
    isFlagshipFeatured: true,
  },
  {
    id: 'crm-enterprise-ops',
    category: 'CRM & Operations',
    storefrontGroup: 'CRM & Automation',
    name: 'Enterprise Operations & Communication CRM',
    shortDescription:
      'Complete digital operations command center uniting storefront administration, omnichannel customer communications, SLA ticketing, and executive BI.',
    recommendedPkr: 599000,
    optionalUsd: 2160,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '6–8 Weeks',
    deliverables: [
      'Multi-department operations terminal (Sales, Support, Fulfillment, Finance)',
      'Enterprise communication hub with template governance & broadcast queues',
      'Real-time storefront & catalog synchronization',
      'Custom executive telemetry, SLA alerts & role-restricted access',
    ],
    architectureStack: 'React · Express · Distributed Queue Workers · PostgreSQL',
    sourceBlueprint: 'PlayBeat Digital Enterprise Admin Communication CRM.pdf',
  },

  // 4. Lead Generation
  {
    id: 'lead-management-dashboard',
    category: 'Lead Generation',
    storefrontGroup: 'Lead Generation',
    name: 'Lead Management Dashboard',
    shortDescription:
      'Structured B2B/B2C lead repository with advanced filtering, qualification scoring, tag segmentation, and one-click export.',
    recommendedPkr: 199000,
    optionalUsd: 720,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '2 Weeks',
    deliverables: [
      'High-density tabular lead explorer with multi-column filtering',
      'Lead qualification scoring & status tagging',
      'Bulk CSV import, deduplication & clean export',
      'Outreach status tracking & notes history',
    ],
    architectureStack: 'React · TypeScript · Tabular Data Engine',
    sourceBlueprint: 'PlayBeat Lead Pulse Plus.pdf',
  },
  {
    id: 'lead-automated-intelligence',
    category: 'Lead Generation',
    storefrontGroup: 'Lead Generation',
    name: 'Automated Lead Intelligence Platform',
    shortDescription:
      'Automated prospect discovery and enrichment engine with scheduled extraction jobs, contact verification, and campaign list building.',
    recommendedPkr: 349000,
    optionalUsd: 1260,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–5 Weeks',
    deliverables: [
      'Automated data extraction jobs & category/location targeting',
      'Email syntax, MX & phone deliverability verification',
      'Enriched company profiles with industry & size segmentation',
      'Direct webhook sync to CRM & outreach sequences',
    ],
    architectureStack: 'Node.js Worker Bots · React Console · Queue Pipeline',
    sourceBlueprint: 'PlayBeat Lead Pulse Plus.pdf',
  },
  {
    id: 'lead-enterprise-pulse',
    category: 'Lead Generation',
    storefrontGroup: 'Lead Generation',
    name: 'Enterprise Lead Pulse System',
    shortDescription:
      'Full-scale B2B lead intelligence and extraction infrastructure featuring worker bot orchestration, verification pipelines, CRM pipeline, and multi-seat governance.',
    recommendedPkr: 549000,
    optionalUsd: 1980,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–7 Weeks',
    deliverables: [
      'Dedicated worker bot cluster for continuous lead discovery & enrichment',
      'Multi-stage verification engine & segmented master databases',
      'Built-in CRM pipeline, campaign triggers & custom API/CSV exports',
      'Team/seat management, usage quotas & role-based workspace isolation',
    ],
    architectureStack: 'Distributed Worker Fleet · PostgreSQL · React Admin Console',
    sourceBlueprint: 'PlayBeat Lead Pulse Plus.pdf',
    isFlagshipFeatured: true,
  },

  // 5. Real Estate
  {
    id: 're-agency-website',
    category: 'Real Estate',
    storefrontGroup: 'Real Estate',
    name: 'Real Estate Agency Website',
    shortDescription:
      'Modern property showcase for real estate agencies and developers featuring project portfolios, plot/unit availability, and direct WhatsApp inquiry routing.',
    recommendedPkr: 199000,
    optionalUsd: 720,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '2–3 Weeks',
    deliverables: [
      'Property & housing society showcase with high-res galleries & floorplans',
      'Search by location, price bracket, marla/kanal size & property type',
      'Instant WhatsApp & call lead capture per listing',
      'Easy listing management dashboard for agency staff',
    ],
    architectureStack: 'React · Tailwind CSS · Property CMS',
    sourceBlueprint: 'Lifestyle Atlas - Real Estate Property Portal Rawalpindi Islamabad.pdf',
  },
  {
    id: 're-listing-portal',
    category: 'Real Estate',
    storefrontGroup: 'Real Estate',
    name: 'Property Listing Portal + Admin',
    shortDescription:
      'Authenticated property portal with multi-agent submissions, verification workflows, featured listings, and structured buyer inquiry management.',
    recommendedPkr: 349000,
    optionalUsd: 1260,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '4–5 Weeks',
    deliverables: [
      'Agent & seller registration with listing submission workflows',
      'Admin verification badge system & featured property placements',
      'Interactive price calculators, area converters & comparison tools',
      'Lead routing console with agent performance tracking',
    ],
    architectureStack: 'Next.js · Node.js · PostgreSQL · Media Storage',
    sourceBlueprint: 'Lifestyle Atlas - Real Estate Property Portal Rawalpindi Islamabad.pdf',
  },
  {
    id: 're-marketplace-maps',
    category: 'Real Estate',
    storefrontGroup: 'Real Estate',
    name: 'Premium Property Marketplace + Maps/Agents',
    shortDescription:
      'Flagship real estate portal modeled on Lifestyle Atlas: interactive geographic mapping, verified agent workflows, property valuation requests, and staff CRM.',
    recommendedPkr: 499000,
    optionalUsd: 1790,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–6 Weeks',
    deliverables: [
      'Interactive geographic map search with sector/society boundary pins',
      'Authenticated listings, agent directories & valuation request workflows',
      'Direct WhatsApp engagement, viewing scheduler & buyer CRM pipeline',
      'Multi-role staff administration, analytics & listing moderation',
    ],
    architectureStack: 'React · Geospatial Map Engine · PostgreSQL · Staff CRM',
    sourceBlueprint: 'Lifestyle Atlas - Real Estate Property Portal Rawalpindi Islamabad.pdf',
    isFlagshipFeatured: true,
  },

  // 6. Education
  {
    id: 'edu-course-website',
    category: 'Education',
    storefrontGroup: 'Education',
    name: 'Online Course Website',
    shortDescription:
      'Dedicated digital academy website for institutes and educators with curriculum showcases, student enrollment, payment collection, and video lessons.',
    recommendedPkr: 199000,
    optionalUsd: 720,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '2–3 Weeks',
    deliverables: [
      'Course catalog with syllabus breakdowns & instructor profiles',
      'Student registration, fee payment & batch scheduling',
      'Protected video lesson player & downloadable study resources',
      'Admin dashboard for enrollment & student management',
    ],
    architectureStack: 'React · Node.js · Secure Media Streaming',
    sourceBlueprint: 'University of Diverse Languages(1).pdf',
  },
  {
    id: 'edu-lms-platform',
    category: 'Education',
    storefrontGroup: 'Education',
    name: 'Learning Management System (LMS)',
    shortDescription:
      'Comprehensive institutional LMS featuring structured modules, quizzes, student cohorts, attendance tracking, grading rubrics, and verifiable certificates.',
    recommendedPkr: 349000,
    optionalUsd: 1260,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '4–5 Weeks',
    deliverables: [
      'Multi-role portals for Students, Instructors & Academic Admins',
      'Interactive assessments, timed quizzes & automated grading',
      'Progress tracking, cohort management & QR-verifiable certificates',
      'Discussion forums, assignment uploads & parent/student reports',
    ],
    architectureStack: 'React · TypeScript · PostgreSQL · Certificate Engine',
    sourceBlueprint: 'University of Diverse Languages(1).pdf',
  },
  {
    id: 'edu-ai-language',
    category: 'Education',
    storefrontGroup: 'Education',
    name: 'AI Language Learning Platform',
    shortDescription:
      'Next-generation multilingual education platform featuring AI conversation tutoring, pronunciation & grammar evaluation, exam portals, and digital certification.',
    recommendedPkr: 499000,
    optionalUsd: 1790,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–6 Weeks',
    deliverables: [
      'Multilingual program architecture with adaptive proficiency tracks',
      '24/7 AI interactive language tutor & real-time feedback engine',
      'Dedicated exam portal with automated scoring & certification issuance',
      'Learner profile analytics, institutional admin & cohort billing',
    ],
    architectureStack: 'React · Gemini AI Integration · Node.js · LMS Core',
    sourceBlueprint: 'University of Diverse Languages(1).pdf',
    isFlagshipFeatured: true,
  },

  // 7. FinTech / Dashboards
  {
    id: 'fin-analytics-dashboard',
    category: 'FinTech / Dashboards',
    storefrontGroup: 'FinTech',
    name: 'Financial Analytics Dashboard',
    shortDescription:
      'Executive financial telemetry and reporting terminal with real-time P&L visualization, cashflow ledgers, multi-currency reconciliation, and audit exports.',
    recommendedPkr: 249000,
    optionalUsd: 900,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '3 Weeks',
    deliverables: [
      'Precision tabular financial ledgers with multi-currency support',
      'Interactive revenue, expense & margin variance charts',
      'Automated CSV/Excel/PDF board report generation',
      'Role-restricted financial visibility & audit logs',
    ],
    architectureStack: 'React · D3/Recharts · Tabular Ledger API',
  },
  {
    id: 'fin-digital-asset-dashboard',
    category: 'FinTech / Dashboards',
    storefrontGroup: 'FinTech',
    name: 'Digital Asset Market Dashboard',
    shortDescription:
      'Low-latency market intelligence and portfolio tracking terminal with live orderbook feeds, technical charting, watchlist alerts, and risk analytics.',
    recommendedPkr: 349000,
    optionalUsd: 1260,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '4–5 Weeks',
    deliverables: [
      'Real-time WebSocket market ticker & multi-asset portfolio tracker',
      'Interactive candlestick & depth charting with custom indicators',
      'Automated price/volume threshold alerts via WhatsApp & Telegram',
      'Historical performance attribution & PnL breakdown',
    ],
    architectureStack: 'React · WebSockets · Time-Series Data Engine',
  },
  {
    id: 'fin-custom-platform',
    category: 'FinTech / Dashboards',
    storefrontGroup: 'FinTech',
    name: 'Custom FinTech Web Platform',
    shortDescription:
      'Bespoke financial technology web application built for payment orchestration, escrow workflows, investor portals, or algorithmic trading operations.',
    recommendedPkr: 599000,
    optionalUsd: 2160,
    isStartingFrom: true,
    packageLevel: 'Enterprise',
    deliveryTime: '6–8 Weeks',
    deliverables: [
      'Double-entry immutable transaction ledger & reconciliation engine',
      'KYC/AML verification workflows & multi-factor security',
      'Investor/client portals with real-time statement generation',
      'Compliance audit trail, webhook integrations & high-availability hosting',
    ],
    architectureStack: 'TypeScript · Node.js · High-Integrity Relational Ledger',
  },

  // 8. Admin Systems
  {
    id: 'admin-custom-dashboard',
    category: 'Admin Systems',
    storefrontGroup: 'Admin Systems',
    name: 'Custom Admin Dashboard',
    shortDescription:
      'Tailored internal back-office control panel for managing users, inventory, bookings, or operational records with clean data tables and search.',
    recommendedPkr: 149000,
    optionalUsd: 540,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '2 Weeks',
    deliverables: [
      'Custom CRUD data tables with sorting, filtering & bulk actions',
      'KPI summary cards & operational status monitors',
      'Secure staff authentication & activity history',
      'REST API connection to existing databases or mobile apps',
    ],
    architectureStack: 'React · TypeScript · REST API · Tailwind CSS',
  },
  {
    id: 'admin-enterprise-rbac',
    category: 'Admin Systems',
    storefrontGroup: 'Admin Systems',
    name: 'Enterprise Admin Panel + RBAC',
    shortDescription:
      'Security-hardened administration console featuring granular Role-Based Access Control (RBAC), approval chains, audit logging, and department views.',
    recommendedPkr: 299000,
    optionalUsd: 1080,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Granular role & permission matrix (Super Admin, Manager, Operator, Auditor)',
      'Maker-checker approval workflows for sensitive operations',
      'Comprehensive immutable security & action audit logs',
      'Custom report builder & scheduled data exports',
    ],
    architectureStack: 'React · Node.js · PostgreSQL · RBAC Policy Engine',
    sourceBlueprint: 'PlayBeat Operations Terminal CRM Restricted Access.pdf',
  },
  {
    id: 'admin-multirole-platform',
    category: 'Admin Systems',
    storefrontGroup: 'Admin Systems',
    name: 'Multi-role Management Platform',
    shortDescription:
      'End-to-end organizational ERP and multi-branch management platform coordinating staff, franchises, inventory, client accounts, and billing.',
    recommendedPkr: 449000,
    optionalUsd: 1620,
    isStartingFrom: false,
    packageLevel: 'Enterprise',
    deliveryTime: '5–6 Weeks',
    deliverables: [
      'Dedicated portals for HQ, Branch Managers, Field Staff & Clients',
      'Cross-branch inventory, resource scheduling & financial consolidation',
      'Automated SLA monitoring & escalation notifications',
      'Single Sign-On (SSO) readiness & API gateway integration',
    ],
    architectureStack: 'React · Node.js · Multi-Tenant PostgreSQL',
    sourceBlueprint: 'PlayBeat Digital Enterprise Admin Communication CRM.pdf',
  },

  // 9. Automation
  {
    id: 'auto-workflow',
    category: 'Automation',
    storefrontGroup: 'CRM & Automation',
    name: 'Business Workflow Automation',
    shortDescription:
      'Eliminate manual data entry by connecting your web forms, spreadsheets, invoicing, and team notifications into reliable automated pipelines.',
    recommendedPkr: 199000,
    optionalUsd: 720,
    isStartingFrom: false,
    packageLevel: 'Basic',
    deliveryTime: '10–14 Days',
    deliverables: [
      'Up to 10 custom automated cross-app workflows & webhooks',
      'Automated PDF invoice/receipt generation & email dispatch',
      'Google Sheets, Slack, WhatsApp & database synchronization',
      'Error monitoring dashboard with automatic retry logic',
    ],
    architectureStack: 'Node.js Webhooks · REST APIs · Background Queues',
  },
  {
    id: 'auto-crm-marketing',
    category: 'Automation',
    storefrontGroup: 'CRM & Automation',
    name: 'CRM + Marketing Automation',
    shortDescription:
      'Full-funnel nurture and conversion engine combining behavior-triggered WhatsApp/email sequences, lead scoring, and automated pipeline progression.',
    recommendedPkr: 349000,
    optionalUsd: 1260,
    isStartingFrom: false,
    packageLevel: 'Professional',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Multi-step drip sequences across WhatsApp & Email',
      'Behavioral lead scoring & automatic sales rep alerts',
      'Abandoned inquiry recovery & appointment booking automation',
      'Campaign ROI attribution & conversion funnel analytics',
    ],
    architectureStack: 'React · Node.js · Event-Driven Automation Engine',
    sourceBlueprint: 'PlayBeat Operations Terminal CRM Restricted Access.pdf',
  },
  {
    id: 'auto-enterprise-suite',
    category: 'Automation',
    storefrontGroup: 'CRM & Automation',
    name: 'Enterprise Automation Suite',
    shortDescription:
      'Custom-engineered autonomous operations infrastructure with background worker fleets, AI document processing, ERP synchronization, and custom webhooks.',
    recommendedPkr: 499000,
    optionalUsd: 1790,
    isStartingFrom: true,
    packageLevel: 'Enterprise',
    deliveryTime: '5–7 Weeks',
    deliverables: [
      'Custom background worker infrastructure for high-volume data jobs',
      'AI-assisted document parsing, classification & data extraction',
      'Bi-directional synchronization between legacy ERPs and modern web apps',
      'Real-time queue telemetry, dead-letter recovery & SLA alerts',
    ],
    architectureStack: 'Node.js Worker Cluster · Gemini AI · Redis/PostgreSQL',
    sourceBlueprint: 'PlayBeat Lead Pulse Plus.pdf',
  },

  // 10. Custom Development
  {
    id: 'custom-mvp-webapp',
    category: 'Custom Development',
    storefrontGroup: 'Custom Web Apps',
    name: 'MVP Web Application',
    shortDescription:
      'Rapid, production-grade Minimum Viable Product built for founders and enterprises to launch, validate, and onboard paying users in weeks.',
    recommendedPkr: 249000,
    optionalUsd: 900,
    isStartingFrom: true,
    packageLevel: 'Basic',
    deliveryTime: '3–4 Weeks',
    deliverables: [
      'Core product UX/UI, user authentication & primary database schema',
      'Up to 3 core functional workflows + payment/subscription integration',
      'Admin management view for early user & content oversight',
      'Production cloud deployment & clean modular codebase',
    ],
    architectureStack: 'React · TypeScript · Node.js · PostgreSQL',
  },
  {
    id: 'custom-saas-platform',
    category: 'Custom Development',
    storefrontGroup: 'Custom Web Apps',
    name: 'SaaS Platform Development',
    shortDescription:
      'Multi-tenant commercial SaaS application with subscription billing, workspace isolation, team invites, API keys, and super-admin telemetry.',
    recommendedPkr: 449000,
    optionalUsd: 1620,
    isStartingFrom: true,
    packageLevel: 'Professional',
    deliveryTime: '5–7 Weeks',
    deliverables: [
      'Multi-tenant workspace architecture with team member invitations',
      'Tiered subscription billing, usage metering & plan upgrades',
      'Super-admin tenant management, feature flags & system analytics',
      'REST API documentation & webhook extensibility',
    ],
    architectureStack: 'Next.js / React · Node.js · Multi-Tenant PostgreSQL',
  },
  {
    id: 'custom-enterprise-webapp',
    category: 'Custom Development',
    storefrontGroup: 'Custom Web Apps',
    name: 'Enterprise Custom Web Application',
    shortDescription:
      'Flagship bespoke software engineering for mission-critical enterprise systems, custom portals, SaaS platforms, workflow automation, and high-security administration.',
    recommendedPkr: 699000,
    optionalUsd: 2520,
    isStartingFrom: true,
    packageLevel: 'Enterprise',
    deliveryTime: '6–10 Weeks',
    deliverables: [
      'End-to-end systems architecture, custom database & API engineering',
      'Enterprise authentication, granular RBAC & full audit logging',
      'Custom executive dashboards, automated worker pipelines & 3rd-party integrations',
      'Dedicated staging/production environments, documentation & team training',
    ],
    architectureStack: 'Full-Stack TypeScript · Dedicated Cloud Infrastructure',
    sourceBlueprint: 'Premium Digital Marketplace Smart Projectors PlayBeat Digital.pdf',
    isFlagshipFeatured: true,
  },
];

export function formatPkr(amount: number, isStartingFrom = false): string {
  const formatted = `PKR ${amount.toLocaleString('en-PK')}`;
  return isStartingFrom ? `From ${formatted}` : formatted;
}

export function formatUsd(amount: number, isStartingFrom = false): string {
  const formatted = `$${amount.toLocaleString('en-US')} USD`;
  return isStartingFrom ? `From ${formatted}` : formatted;
}
