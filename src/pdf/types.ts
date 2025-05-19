// Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
//
// This software is the property of WSO2 LLC. and its suppliers, if any.
// Dissemination of any information or reproduction of any material contained
// herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
// You may not alter or remove any copyright or other notice from copies of this content.

// This file contains the types used in the csreport-pdf 
export interface csReportData {
  subscriptionDetails: SubscriptionDetail;
  casesRecords: CaseRecordDetail[];
  slaDetails: SlaStats;
  projectDeployments: ProjectDeployment[];
  monthlyCounts: MonthlyCount[];
}

//subscription details
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

//sla details
export interface SlaStats {
  slaRecords: SlaRecordDetail[];
  slaPerformanceStats: SlaPerformanceStats;
}

//sla record details
export interface SlaRecordDetail {
  task: string;
  slaDefinition: string;
  businessElapsedPercentage: string;
}

//sla performance stats
export interface SlaPerformanceStats {
  Workaround: SlaStatsDetail;
  Resolution: SlaStatsDetail;
  Response: SlaStatsDetail;
}

//sla stats detail
export interface SlaStatsDetail {
  fraction: string | number;
  percentage: string;
}

//monthly counts of incidents and queries
export interface MonthlyCount {
  yearAndMonth: string;
  counts: Count;
}

// number of incidents and queries
export interface Count {
  incidentCount: number;
  queryCount: number;
}

//case record details
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

//project deployments details
export interface ProjectDeployment {
  name: string;
  products: Product[];
}

//product details
export interface Product {
  name: string;
  version: string;
  supportStatus: string;
  eolDate: string;
  cores?: string;
  tps?: string;
  updateLevelInfo?: number;
}
