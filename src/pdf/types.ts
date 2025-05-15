export interface CSReportData {
  subscriptionDetails: SubscriptionDetail;
  casesRecords: CaseRecordDetail[];
  slaDetails: SlaStats;
  projectDeployments: ProjectDeployment[];
  monthlyCounts: MonthlyCount[];
}

// ─────────── Subscription Info ───────────

export interface SubscriptionDetail {
  projectName: string;
  projectKey: string;
  projectType: string;
  accountName: string;
  startDate: string;
  endDate: string;
  supportTier: string;
  subscription: string;
  totalQueryHours: string;
  consumedQueryHours: string;
}

// ─────────── SLA Info ───────────

export interface SlaStats {
  slaRecords: SlaRecordDetail[];
  slaPerformanceStats: SlaPerformanceStats;
}

export interface SlaRecordDetail {
  task: string;
  slaDefinition: string;
  businessElapsedPercentage: string;
}

export interface SlaPerformanceStats {
  Workaround: SlaStatsDetail;
  Resolution: SlaStatsDetail;
  Response: SlaStatsDetail;
}

export interface SlaStatsDetail {
  fraction: string | number;
  percentage: string;
}

// ─────────── Monthly Counts ───────────

export interface MonthlyCount {
  yearAndMonth: string;
  counts: Count;
}

export interface Count {
  incidentCount: number;
  queryCount: number;
}

// ─────────── Case Records ───────────

export interface CaseRecordDetail {
  caseSysId: string;
  caseNumber: string;
  engagementType: string;
  caseType: string;
  casePriority: string;
  caseState: string;
  opened: string;
  description: string;
  updated: string;
  deployment: string;
  productName: string;
}

// ─────────── Project Deployments ───────────

export interface ProjectDeployment {
  name: string;
  products: Product[];
}

export interface Product {
  name: string;
  version: string;
  supportStatus: string;
  eolDate: string;
  cores?: string;
  tps?: string;
  updateLevelInfo?: number;
}
