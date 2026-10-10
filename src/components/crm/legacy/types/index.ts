export type JobStatus = 'QUEUED' | 'RUNNING' | 'RETRYING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export type EmailStatus = 'VALID' | 'RISKY' | 'INVALID' | 'UNVERIFIED';

export type OutreachType = 'EMAIL' | 'WHATSAPP' | 'CALL';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'STAFF';

export type FieldVerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'CONFLICTING' | 'NOT_AVAILABLE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string;
  phone?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  seatId?: string;
  createdAt: string;
}

export interface Seat {
  id: string;
  name: string;
  seatNumber: number;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  targetLeads: number; // default 250
  assignedLeadsCount: number;
  specialization: 'GENERAL' | 'WHATSAPP' | 'CALLING' | 'EMAIL';
  status: 'ACTIVE' | 'PAUSED' | 'OFFLINE';
}

export interface EmailVerificationResult {
  email: string;
  status: EmailStatus;
  confidenceScore: number; // 0 - 100
  mxValid: boolean;
  domainValid: boolean;
  isDisposable: boolean;
  isRoleAccount: boolean;
  provider: string; // 'Google Workspace', 'Microsoft 365', 'Generic MX', 'Unknown'
  verifiedAt: string;
  verificationSource: string;
  rawDetails?: string;
}

export interface CrawledPageFinding {
  url: string;
  path: string;
  status: number;
  emailsFound: string[];
  phonesFound: string[];
  whatsAppLinks: string[];
  socialLinks: { [platform: string]: string };
}

export interface FieldSourceTrace {
  field: string;
  value: string | number | boolean | null;
  source: string; // e.g. 'official_website', 'openstreetmap', 'opencorporates', 'public_directory', 'deep_crawl'
  status: FieldVerificationStatus;
  confidence?: number; // 0 - 100
  timestamp: string;
  rawReference?: string;
}

export interface CategoryTaxonomy {
  primaryCategory: string;
  secondaryCategory?: string;
  sourceCategory?: string;
  categoryConfidence: number; // 0 - 100
  categoryVerificationSource: string;
  categoryVerified: boolean;
}

export interface GeographicEntity {
  country: string;
  state?: string; // or province
  district?: string;
  city: string;
  town?: string;
  area?: string; // neighborhood
  postalCode?: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  locationSource: string;
  locationVerified: boolean;
}

export interface QualityScoreBreakdown {
  categoryScore: number; // max 20
  locationScore: number; // max 20
  businessIdentityScore: number; // max 15
  websiteScore: number; // max 10
  emailScore: number; // max 15
  phoneScore: number; // max 10
  crossSourceScore: number; // max 10
  totalScore: number; // max 100
}

export interface Lead {
  id: string;
  campaignId: string;
  companyName: string;
  domain: string;
  normalizedDomain: string;
  websiteUrl: string;
  email?: string;
  emailStatus?: EmailStatus;
  emailConfidence?: number;
  emailMxValid?: boolean;
  emailIsDisposable?: boolean;
  emailIsRole?: boolean;
  emailVerified?: boolean;
  phone?: string;
  normalizedPhone?: string;
  phoneVerified?: boolean;
  hasWhatsApp?: boolean;
  whatsAppLink?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  district?: string;
  town?: string;
  area?: string;
  postalCode?: string;
  streetAddress?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: string;
  locationVerified?: boolean;
  industry?: string;
  primaryCategory?: string;
  secondaryCategory?: string;
  sourceCategory?: string;
  categoryConfidence?: number;
  categoryVerificationSource?: string;
  categoryVerified?: boolean;
  leadScore: number; // 0 - 100
  qualityScore?: number;
  qualityBreakdown?: QualityScoreBreakdown;
  fingerprint: string; // SHA-256 identity hash
  discoverySource: string; // e.g. 'OpenStreetMap', 'OpenCorporates', 'Directory:ChamberOfCommerce', etc.
  assignedSeatId?: string;
  assignedEmployeeName?: string;
  crawledPagesCount: number;
  sources?: FieldSourceTrace[];
  conflictStatus?: boolean;
  conflictingFields?: Array<{ field: string; values: Array<{ value: string; source: string }> }>;
  firstSeenAt?: string;
  lastSeenAt?: string;
  sourceIds?: string[];
  duplicateOf?: string;
  isSynthetic?: boolean; // strictly false
  isVerifiedMatch?: boolean;
  socials?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  contactPerson?: {
    name?: string;
    title?: string;
  };
  businessStatus?: BusinessStatus;
  qualityScores?: LeadQualityScores;
  verificationLabel?: VerificationLabel;
  evidence?: FieldEvidenceItem[];
  conflicts?: FieldConflict[];
  duplicateClusterId?: string;
  changeHistory?: LeadChangeRecord[];
  filterContractHash?: string;
  verifiedAt?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'BOUNCED' | 'OPT_OUT';
  createdAt: string;
  updatedAt: string;
}

export interface DiscoverySourceStats {
  id: string;
  name: string;
  type: 'OPENSTREETMAP' | 'OPENCORPORATES' | 'PUBLIC_DIRECTORY' | 'SEARCH_PERMITTED' | 'INDUSTRY_REGISTRY' | 'GEO_CLUSTER';
  leadsFound: number;
  uniqueLeadsAccepted: number;
  duplicatesRejected: number;
  invalidsRejected: number;
  status: 'IDLE' | 'ACTIVE' | 'EXHAUSTED' | 'RATE_LIMITED' | 'ERROR';
  executionTimeMs: number;
  error?: string;
}

export interface CampaignFilters {
  category: string[];
  country: string[];
  province: string[];
  city: string[];
  area?: string[];
  requireEmail: boolean;
  requirePhone: boolean;
  requireWebsite: boolean;
  minimumQuality: number; // e.g. 70
  uniqueOnly: boolean;
}

export interface ExtractionAuditRecord {
  extractionId: string;
  timestamp: string;
  userFilters: CampaignFilters;
  sourcesUsed: string[];
  rawRecordsFound: number;
  normalizedRecords: number;
  categoryRejected: number;
  locationRejected: number;
  duplicateRecords: number;
  invalidRecords: number;
  conflictingRecords: number;
  verifiedRecords: number;
  finalRecords: number;
  exclusionReason?: string;
  sampleRejections?: Array<{
    businessName: string;
    reason: 'CATEGORY_MISMATCH' | 'LOCATION_MISMATCH' | 'DUPLICATE' | 'SYNTHETIC_REJECTED' | 'MISSING_REQUIRED_FIELD' | 'LOW_QUALITY' | 'SUPPRESSED';
    details: string;
    source: string;
  }>;
}

export interface ExpansionProposal {
  type: 'AREA' | 'CITY' | 'PROVINCE' | 'CATEGORY';
  label: string;
  description: string;
  expandedValue: string;
}

export interface Campaign {
  id: string;
  name: string;
  targetCount: number; // default 1000
  currentUniqueLeads: number;
  duplicatesBlocked: number;
  invalidsFiltered: number;
  niche: string;
  location: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  activeJobId?: string;
  sourceWaterfall: string[]; // ordered sources
  currentSourceIndex: number;
  filters?: CampaignFilters;
  filterContractHash?: string;
  auditRecord?: ExtractionAuditRecord;
  expansionOptions?: ExpansionProposal[];
  createdAt: string;
  updatedAt: string;
}

export interface PersistentJob {
  id: string;
  campaignId: string;
  status: JobStatus;
  progressPercent: number;
  targetCount: number;
  processedCount: number;
  uniqueCount: number;
  duplicatesCount: number;
  workerId: string;
  leaseAcquiredAt: string;
  lastHeartbeat: string;
  leaseExpiresAt: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  activeSource?: string;
  currentStepMessage: string;
  telemetry: {
    sources: DiscoverySourceStats[];
    leadsPerSecond: number;
    startedAt: string;
    completedAt?: string;
  };
}

export interface CallLog {
  id: string;
  leadId: string;
  leadName: string;
  phoneNumber: string;
  agentName: string;
  seatNumber: number;
  durationSeconds: number;
  status: 'COMPLETED' | 'BUSY' | 'NO_ANSWER' | 'VOICEMAIL' | 'FAILED';
  notes: string;
  createdAt: string;
}

export interface OutreachLog {
  id: string;
  leadId: string;
  seatId: string;
  channel: OutreachType;
  recipient: string;
  subject?: string;
  body: string;
  status: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'REPLIED' | 'FAILED';
  sentAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface PlayBeatDigitalApiConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret?: string;
  syncEnabled: boolean;
  autoExportLeads: boolean;
  lastTestedAt?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'UNCONFIGURED';
  lastStatusMessage?: string;
  stats?: {
    leadsExported: number;
    lastSyncedAt?: string;
  };
}

export interface VerificationLogItem {
  id: string;
  leadId: string;
  companyName: string;
  email: string;
  status: EmailStatus;
  confidence: number;
  mxValid: boolean;
  provider: string;
  isDisposable: boolean;
  isRole: boolean;
  durationMs: number;
  timestamp: string;
}

export interface VerificationJobTelemetry {
  status: 'IDLE' | 'PROCESSING' | 'PAUSED';
  queueLength: number;
  totalEnqueued: number;
  totalVerified: number;
  validCount: number;
  riskyCount: number;
  invalidCount: number;
  currentLead?: {
    id: string;
    companyName: string;
    email: string;
    stage: string;
  };
  recentLogs: VerificationLogItem[];
  workerId: string;
  concurrency: number;
  lastVerifiedAt?: string;
  avgDurationMs: number;
  autoTriggerEnabled: boolean;
}

// ---------------------------------------------------------------------------
// ENTERPRISE INTELLIGENCE & VERIFICATION TYPES
// ---------------------------------------------------------------------------

export type BusinessStatus = 'ACTIVE' | 'TEMPORARILY_CLOSED' | 'PERMANENTLY_CLOSED' | 'MOVED' | 'UNKNOWN';

export type VerificationLabel = 'VERIFIED' | 'STRONGLY_VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'CONFLICTING' | 'REJECTED';

export interface FieldEvidenceItem {
  id: string;
  field: string;
  value: any;
  source: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  sourcePriority: number; // 1 = highest (Tier 1)
  snippet?: string;
  confidence: number; // 0 - 100
  verificationMethod: 'REGISTRY_RECORD' | 'GOVERNMENT_GAZETTE' | 'OSM_GEOTAG' | 'DNS_MX_PROBE' | 'HTTP_DOM_PARSE' | 'TELCO_E164_PROBE' | 'TAXONOMY_MATCH' | 'GEOSPATIAL_POLYGON' | 'E164_FORMAT';
  retrievedAt: string;
}

export interface FieldConflict {
  id: string;
  field: string;
  valueA: string;
  sourceA: string;
  valueB: string;
  sourceB: string;
  detectedAt: string;
  resolvedValue?: string;
  resolutionStatus: 'UNRESOLVED' | 'RESOLVED_BY_AUTHORITY' | 'RESOLVED_BY_HUMAN';
  resolvedBy?: string;
}

export interface LeadQualityScores {
  identityScore: number;     // 0 - 20
  locationScore: number;     // 0 - 20
  categoryScore: number;     // 0 - 20
  contactScore: number;      // 0 - 20
  sourceScore: number;       // 0 - 10
  freshnessScore: number;    // 0 - 10
  overallScore: number;      // 0 - 100
  verificationLabel: VerificationLabel;
}

export interface LeadChangeRecord {
  id: string;
  leadId: string;
  changedField: string;
  oldValue: string | null;
  newValue: string;
  detectedAt: string;
  source: string;
  type: 'PHONE_CHANGED' | 'WEBSITE_CHANGED' | 'ADDRESS_CHANGED' | 'CATEGORY_CHANGED' | 'STATUS_CHANGED';
}

export type SuppressionType = 
  | 'PREVIOUSLY_EXPORTED'
  | 'PREVIOUSLY_CONTACTED'
  | 'OPTED_OUT'
  | 'DO_NOT_CONTACT'
  | 'INVALID'
  | 'CLOSED'
  | 'DUPLICATE'
  | 'BLOCKED_DOMAIN'
  | 'BLOCKED_BUSINESS'
  | 'BLOCKED_CATEGORY';

export interface SuppressionRecord {
  id: string;
  type: SuppressionType;
  targetValue: string; // domain, phone, email, or company name
  reason: string;
  scope: 'GLOBAL' | 'CAMPAIGN';
  campaignId?: string;
  createdAt: string;
  createdBy?: string;
  addedBy?: string;
}

export interface ImmutableFilterContract {
  filterHash: string; // SHA-256 hash of canonical contract
  createdAt: string;
  category: {
    include: string[];
    exclude: string[];
    secondary?: string[];
    businessType?: string[];
    requiredKeywords?: string[];
    excludedKeywords?: string[];
  };
  geo: {
    country: string[];
    province: string[];
    district?: string[];
    city: string[];
    area?: string[];
    postalCodes?: string[];
    radiusKm?: number;
    centerLat?: number;
    centerLon?: number;
  };
  contacts: {
    requireEmail: boolean;
    requirePhone: boolean;
    requireWebsite: boolean;
    requireWhatsApp?: boolean;
    requireSocials?: boolean;
  };
  minimumQuality: number;
  targetCount: number;
  uniqueOnly: boolean;
  freshnessDays?: number; // 7, 30, 90, 180, 365
}

export interface SourceConnectorConfig {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  tierLabel: string;
  type: 'OFFICIAL_REGISTRY' | 'GOVERNMENT' | 'GEOSPATIAL' | 'DIRECTORY' | 'WEBSITE_CRAWL' | 'API';
  enabled: boolean;
  priority: number;
  rateLimitPerMin: number;
  dailyQuota: number;
  currentUsageToday: number;
  lastPingMs: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'RATE_LIMITED' | 'OFFLINE';
  lastCheckedAt: string;
  recordsFound: number;
  recordsVerified: number;
}

export interface DuplicateCluster {
  clusterId: string;
  primaryLeadId: string;
  candidateLeadIds: string[];
  matchSignals: {
    sameDomain: boolean;
    samePhone: boolean;
    sameExactAddress: boolean;
    sameCoordinates: boolean;
    nameSimilarity: number; // 0 - 100
  };
  confidence: number;
  status: 'PENDING_REVIEW' | 'AUTO_MERGED' | 'CONFIRMED_SEPARATE';
  createdAt: string;
}

export interface ReviewQueueItem {
  id: string;
  leadId: string;
  companyName: string;
  city: string;
  reason: 'UNCERTAIN_CATEGORY' | 'UNCERTAIN_LOCATION' | 'POSSIBLE_DUPLICATE' | 'FIELD_CONFLICT' | 'BORDERLINE_QUALITY';
  description: string;
  leadData: any;
  duplicateCandidate?: any;
  conflicts?: FieldConflict[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MERGED' | 'RESOLVED' | 'DISMISSED';
  reviewedBy?: string;
  reviewedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface WorkerBot {
  id: string;
  name: string;
  category: 'DISCOVERY' | 'VERIFICATION' | 'HYGIENE' | 'EXPORT';
  description: string;
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt?: string;
  nextRunAt?: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'FAILED';
  successCount: number;
  failureCount: number;
  lastError?: string;
  processedTotal: number;
}

export interface BotRunLog {
  id: string;
  botId: string;
  botName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  summary: string;
  itemsProcessed: number;
  itemsUpdated: number;
}

export interface ExportPrivacySettings {
  maskPII: boolean;
  enforceSuppression: boolean;
  stripInternalScores: boolean;
  complianceBasis: string;
  selectedColumns?: string[];
  anonymizePersonalEmails?: boolean;
}

export interface ExportJob {
  id: string;
  createdAt: string;
  format: 'CSV' | 'XLSX' | 'JSON';
  filterSummary: string;
  totalRecords: number;
  status: 'GENERATING' | 'READY' | 'FAILED';
  fileName: string;
  fileSizeBytes?: number;
  downloadUrl: string;
  createdBy: string;
  privacySettings?: ExportPrivacySettings;
  sha256Checksum?: string;
  suppressedCount?: number;
  maskedFieldsCount?: number;
  downloadCount?: number;
  lastDownloadedAt?: string;
}

export interface AutomatedTestCase {
  id: string;
  suite: 'CATEGORY_MATCH' | 'LOCATION_HIERARCHY' | 'DUPLICATE_CLUSTER' | 'DATA_INTEGRITY' | 'SOURCE_EXHAUSTION';
  title: string;
  description: string;
  input: any;
  expectedOutput: any;
  actualOutput?: any;
  passed?: boolean;
  executionTimeMs?: number;
  details?: string;
}

export interface TestSuiteSummary {
  runId: string;
  timestamp: string;
  totalCases: number;
  passedCount: number;
  failedCount: number;
  cases: AutomatedTestCase[];
}

// ============================================================================
// MultiPurpose 2025 Enterprise Sales & Lead Tracking CRM Core Structure
// ============================================================================

export type PipelineStageId =
  | 'inbound'
  | 'contacted'
  | 'qualified'
  | 'demo'
  | 'proposal'
  | 'won'
  | 'lost';

export interface PipelineStageConfig {
  id: PipelineStageId;
  name: string;
  color: string;
  badgeBg: string;
  description: string;
  probability: number;
}

export interface CrmDeal {
  id: string;
  leadId?: string;
  companyName: string;
  dealName: string;
  value: number;
  currency: 'USD' | 'PKR';
  stage: PipelineStageId;
  probability: number;
  assignedSeatId: string;
  assignedRepName: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  expectedCloseDate: string;
  source: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
}

export interface CrmTask {
  id: string;
  title: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'DEMO' | 'PROPOSAL' | 'FOLLOW_UP';
  dueDate: string;
  dueTime?: string;
  dealId?: string;
  companyName?: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  completed: boolean;
  completedAt?: string;
}

export interface CrmActivity {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  dealName: string;
  stageFrom?: string;
  stageTo?: string;
  value?: number;
  type: 'STAGE_CHANGE' | 'TASK_COMPLETED' | 'CALL_LOGGED' | 'NOTE_ADDED' | 'DEAL_CREATED' | 'DEAL_WON';
}

export interface CrmRepPerformance {
  seatId: string;
  name: string;
  role: string;
  avatarBg: string;
  assignedDeals: number;
  wonDeals: number;
  pipelineValue: number;
  wonValue: number;
  quotaAttainment: number; // percentage
  conversionRate: number; // percentage
  callsCount: number;
}

export interface CrmPipelineSummary {
  stages: PipelineStageConfig[];
  deals: CrmDeal[];
  tasks: CrmTask[];
  activities: CrmActivity[];
  reps: CrmRepPerformance[];
  kpis: {
    totalPipelineValue: number;
    weightedForecastValue: number;
    activeDealsCount: number;
    wonDealsCount: number;
    wonRevenue: number;
    averageDealSize: number;
    overallConversionRate: number;
    avgSalesCycleDays: number;
  };
}

