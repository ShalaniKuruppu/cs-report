import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import Handlebars from 'handlebars';
import {
  generateLineChart,
  generatePieChart,
  generateGroupedBarChart,
} from './Utils/chart.util';
import { CSReportData,CaseRecordDetail,SlaStats,ProjectDeployment,MonthlyCount } from './types'; 

@Injectable()
export class PdfService {
  async generateCSReport(data: CSReportData): Promise<string> {
    try {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      
      const template = this.loadTemplate();
      const logoDataUri = this.loadLogo();
      const charts = await this.generateCharts(data);
      const productCoreDetails = this.productCoreSummaries(data.projectDeployments);
      const engagementData = this.filterEngagementCases(data.casesRecords);
      const uniqueProducts = this.getUniqueProductNames(data.projectDeployments);

      const context = this.prepareContext(data, charts, productCoreDetails, logoDataUri,engagementData,uniqueProducts);
      const renderedHtml = template(context);

      await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A5',
        landscape: true,
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      });

      await browser.close();
      return this.savePdf(Buffer.from(pdfBuffer), data.subscriptionDetails.projectKey);
    } catch (err) {
      console.error('Error generating CS Report:', err);
      throw err;
    }
  }

  private loadTemplate(): Handlebars.TemplateDelegate {
    const templatePath = path.resolve(__dirname, '../../src/pdf/template.html');
    const rawHtml = fs.readFileSync(templatePath, 'utf8');
    return Handlebars.compile(rawHtml);
  }

  private loadLogo(): string {
    const logoImagePath = path.join(__dirname, '../../src/pdf/images/wso2-logo-orange.png');
    const logoBase64 = fs.readFileSync(logoImagePath, { encoding: 'base64' });
    return `data:image/png;base64,${logoBase64}`;
  }

  private productCoreSummaries(deployments: ProjectDeployment[]): { label: string; value: string }[]{
    const summaries: { label: string; value: string }[] = [];
    for (const env of deployments || []) {
      for (const p of env.products || []) {
        if (p.name && p.cores) {
          summaries.push({ label: p.name, value: `${p.cores} Cores` });
        }
      }
    }
    return summaries;
  }
  
  private getUniqueProductNames(deployments: ProjectDeployment[] = []): string[] {
  const productSet = new Set<string>();
  for (const env of deployments) {
    for (const product of env.products || []) {
      if (product.name) {
        productSet.add(product.name);
      }
    }
  }
  return Array.from(productSet);
}

  private async generateCharts(data: CSReportData): Promise<Record<string, string>> {
    const [
      lineChartImage,
      createdVsResolvedChart,
      casesByEnvironmentChart,
      createdByProductChart,
      incidentByPriorityChart,
    ] = await Promise.all([
      generateLineChart(data.monthlyCounts || []),
      this.generateCreatedVsResolvedChart(data.casesRecords),
      this.generateCasesByEnvironmentChart(data.casesRecords),
      this.generateCreatedByProductChart(data.casesRecords),
      this.generateIncidentByPriorityChart(data.casesRecords),
    ]);

    return {
      lineChartImage,
      createdVsResolvedChart,
      casesByEnvironmentChart,
      createdByProductChart,
      incidentByPriorityChart,
    };
  }

  private async generateCreatedVsResolvedChart(records: CaseRecordDetail[]): Promise<string> {
    const counts = new Map<string, { Open: number; Closed: number }>();
    for (const record of records || []) {
      const day = record.opened?.split(' ')[0];
      if (!day) continue;
      if (!counts.has(day)) counts.set(day, { Open: 0, Closed: 0 });
      const state = record.caseState;
      if (state === 'Open') counts.get(day)!.Open++;
      if (state === 'Closed') counts.get(day)!.Closed++;
    }
    const days = Array.from(counts.keys()).sort();
    const opened = days.map(d => counts.get(d)?.Open ?? 0);
    const resolved = days.map(d => counts.get(d)?.Closed ?? 0);

    return generateGroupedBarChart(days, [
      { label: 'Opened', data: opened },
      { label: 'Resolved', data: resolved },
    ], 'Created vs Resolved Cases', { chartType: 'state' });
  }

  private async generateCasesByEnvironmentChart(records: CaseRecordDetail[]): Promise<string>{
    const envCounts: Record<string, number> = {};
    for (const record of records || []) {
      const deployment = record.deployment;
      if (deployment && deployment !== 'N/A') {
        envCounts[deployment] = (envCounts[deployment] || 0) + 1;
      }
    }
    return generatePieChart(Object.keys(envCounts), Object.values(envCounts));
  }

  private async generateCreatedByProductChart(records: CaseRecordDetail[]): Promise<string> {
    const monthMap: Record<string, Record<string, number>> = {};
    for (const r of records || []) {
      const date = new Date(r.opened);
      const product = r.productName;
      if (!product || product === 'N/A') continue;
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthMap[month] = monthMap[month] || {};
      monthMap[month][product] = (monthMap[month][product] || 0) + 1;
    }
    const months = Object.keys(monthMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const allProducts = Array.from(new Set(months.flatMap(m => Object.keys(monthMap[m]))));

    const productSeries = allProducts.map(p => ({
      label: p,
      data: months.map(m => monthMap[m]?.[p] || 0),
    }));

    return generateGroupedBarChart(months, productSeries, 'Cases Created by Product', { chartType: 'product' });
  }

  private async generateIncidentByPriorityChart(records: CaseRecordDetail[]): Promise<string> {
    const monthMap = new Map<string, Record<string, number>>();
    for (const record of records || []) {
      const rawDate = record.opened?.split(' ')[0];
      const priority = record.casePriority;
      if (!rawDate || !priority || priority === 'N/A') continue;
      const date = new Date(rawDate);
      const month = date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '/');
      if (!monthMap.has(month)) monthMap.set(month, {});
      const monthData = monthMap.get(month)!;
      monthData[priority] = (monthData[priority] || 0) + 1;
    }
    const months = Array.from(monthMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const priorities = Array.from(new Set(Array.from(monthMap.values()).flatMap(m => Object.keys(m))));
    const prioritySeries = priorities.map(p => ({
      label: p,
      data: months.map(m => monthMap.get(m)?.[p] || 0),
    }));
    return generateGroupedBarChart(months, prioritySeries, 'Incident Created by Priority (Monthly)', { chartType: 'priority' });
  }

  private filterEngagementCases(records: CaseRecordDetail[] = []): CaseRecordDetail[] {
  return records.filter((record) => record.caseType === 'Engagement');
}

  private prepareContext(data: CSReportData, charts: Record<string, string>, productSummaries: any[], logo: string,engagementData : any[],uniqueProducts: string[]) {
    return {
      subscriptionDetails: data.subscriptionDetails,
      slaRecords : data?.slaDetails?.slaRecords || [],
      engagementRecords: engagementData,
      projectDeployments: data?.projectDeployments || {},
      lineChartImage: charts.lineChartImage,
      generatedDate: new Date().toISOString().split('T')[0],
      slaPerformanceStats: data?.slaDetails?.slaPerformanceStats || {},
      productCoreDetails: productSummaries,
      uniqueProducts,
      createdVsResolvedChart: charts.createdVsResolvedChart,
      casesByEnvironmentChart: charts.casesByEnvironmentChart,
      createdByProductChart: charts.createdByProductChart,
      incidentByPriorityChart: charts.incidentByPriorityChart,
      logo,
    };
  }

  private savePdf(buffer: Buffer, projectKey: string): string {
    const outputDir = path.join(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `CS_REPORT_${projectKey}.pdf`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ PDF successfully generated at: ${filePath}`);
    return filePath;
  }
}
