import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { generateLineChart, generatePieChart , generateBarChart,generateGroupedBarChart} from './chart.util';

@Injectable()
export class PdfService {
  async generateCSReport(data: any): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    // Load and compile the HTML template
    const templatePath = path.resolve(__dirname, '../../src/pdf/template.html');
    const rawHtml = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(rawHtml);

    // Generate chart image (base64)
    const chartImage = await generateLineChart(data.monthlyCounts || []);

    Handlebars.registerHelper('uniqueProducts', function (deployments: any[]) {
      const seen = new Set();
      const productList: string[] = [];
    
      deployments.forEach(env => {
        (env.products || []).forEach(p => {
          if (!seen.has(p.name)) {
            seen.add(p.name);
            productList.push(p.name);
          }
        });
      });
    
      return productList;
    });
    
    Handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });

    const productEOLStatus: { product: string; eolDate: string; supportStatus: string }[] = [];
    const seen = new Set();
    for (const env of data?.projectDeployments || []) {
      for (const p of env.products || []) {
        const key = `${p.name} v${p.version}`;
        if (!seen.has(key)) {
          seen.add(key);
          productEOLStatus.push({
            product: key,
            eolDate: p.eolDate ? new Date(p.eolDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '—',
            supportStatus: p.supportStatus || 'Unknown'
          });
        }
      }
}
    // Extract and summarize current products usage (e.g., cores, TPS, etc.)
const currentProductSummaries: { label: string; value: string }[] = [];
const productMap = new Map<string, { cores: number; label: string }>();

for (const env of data.projectDeployments || []) {
  for (const p of env.products || []) {
    if (p.name && p.cores && !isNaN(Number(p.cores))) {
      const label = p.name;
      const key = label;
      const prev = productMap.get(key) || { cores: 0, label };
      productMap.set(key, {
        label,
        cores: prev.cores + Number(p.cores),
      });
    }
    if (p.name?.includes("Gateway") && p.tps) {
      currentProductSummaries.push({
        label: p.name,
        value: `Transactional Cap of ${p.tps}M`,
      });
    }
  }
}

for (const { label, cores } of productMap.values()) {
  currentProductSummaries.push({
    label,
    value: `${cores} Cores`,
  });
}
// Chart generation logic for Created vs Resolved Cases
const createdCases = data.casesRecords.filter((caseData: any) => caseData.caseState === 'Open').length;
console.log('Created Cases:', createdCases);
const resolvedCases = data.casesRecords.filter((caseData: any) => caseData.caseState === 'Closed').length;
console.log('Resolved Cases:', resolvedCases);

// Generate Created vs Resolved Cases Bar Chart
const createdVsResolvedChart = await generateBarChart(
  ['Created', 'Resolved'],
  [createdCases, resolvedCases],
  'Cases Status'
);

// Cases by Deployment Pie Chart
const casesByEnvironment = data.casesRecords.reduce((acc: any, caseData: any) => {
  const deployment = caseData.deployment;
  if (deployment) {
    acc[deployment] = (acc[deployment] || 0) + 1;
  }
  return acc;
}, {});

const environments = Object.keys(casesByEnvironment);
const environmentCounts = Object.values(casesByEnvironment);

// Generate Cases by Deployment Pie Chart
const casesByEnvironmentChart = await generatePieChart(environments, environmentCounts as number[]);

// Utility to generate month labels between two dates in "MMM/YYYY" format
function generateMonthLabels(startDate: Date, endDate: Date): string[] {
  const months: string[] = [];
  const current = new Date(startDate);

  current.setDate(1); // Ensure we're at the start of a month

  while (current < endDate) {
    const label = current.toLocaleString('default', {
      month: 'short',
      year: 'numeric'
    }).replace(' ', '/');
    months.push(label);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

// Step 1: Prepare grouped data using reduce
const casesByMonthAndProduct = data.casesRecords.reduce(
  (acc: { [monthYear: string]: { [product: string]: number } }, record: any) => {
    const product = record.productName;
    const openedDate = new Date(record.opened);

    // Skip invalid entries
    if (!product || product === "N/A" || isNaN(openedDate.getTime())) return acc;

    const monthYear = openedDate.toLocaleString('default', {
      month: 'short',
      year: 'numeric'
    }).replace(' ', '/');

    if (!acc[monthYear]) acc[monthYear] = {};
    if (!acc[monthYear][product]) acc[monthYear][product] = 0;

    acc[monthYear][product]++;
    return acc;
  },
  {}
);

// Step 2: Determine full month range (based on data)
const openedDates = data.casesRecords
  .map((r: any) => new Date(r.opened))
  .filter(d => !isNaN(d.getTime()));

const minDate = new Date(Math.min(...openedDates.map(d => d.getTime())));
const maxDate = new Date(Math.max(...openedDates.map(d => d.getTime())));

const allMonths = generateMonthLabels(minDate, maxDate);

// Step 3: Extract all unique product names
const allProducts = Array.from(
  new Set(Object.values(casesByMonthAndProduct as Record<string, Record<string, number>>).flatMap(monthData => Object.keys(monthData)))
);

// Step 4: Initialize missing months with empty product data
for (const month of allMonths) {
  if (!casesByMonthAndProduct[month]) {
    casesByMonthAndProduct[month] = {};
  }

  for (const product of allProducts) {
    if (!casesByMonthAndProduct[month][product]) {
      casesByMonthAndProduct[month][product] = 0;
    }
  }
}

// Step 5: Build product series for chart
const productSeries = allProducts.map((product) => ({
  label: product,
  data: allMonths.map(month => casesByMonthAndProduct[month][product] || 0),
}));

// Step 6: Generate the grouped bar chart
const createdByProductChart = await generateGroupedBarChart(
  allMonths,
  productSeries,
  'Cases Created by Product'
);




// Incident Created by Priority Bar Chart
const casesByPriority = data.casesRecords.reduce((acc: any, caseData: any) => {
  const priority = caseData.casePriority;
  if (priority && priority !== "N/A") {
    acc[priority] = (acc[priority] || 0) + 1;
  }
  return acc;
}, {});

const priorities = Object.keys(casesByPriority);
const priorityCounts = Object.values(casesByPriority);

// Generate Incident Created by Priority Bar Chart
const incidentByPriorityChart = await generateBarChart(priorities, priorityCounts as number[], 'Incident Created by Priority');


    // Prepare context data
    const context = {
      ...data.subscriptionDetails,
      slaRecords: Array.isArray(data?.slaDetails?.slaRecords) ? data.slaDetails.slaRecords : [],
      projectDeployments: Array.isArray(data?.projectDeployments) ? data.projectDeployments : [],
      businessOverviewText: 'Business overview placeholder text.',
      notesText: 'Some notes about the project.',
      notesImage: '', // optional base64 image
      lineChartImage: new Handlebars.SafeString(`<img src="${chartImage}" alt="Monthly Case Volume Chart" width="1000"/>`),
      generatedDate: new Date().toISOString().split('T')[0],
      slaPerformanceStats: data?.slaDetails?.slaPerformanceStats || {},
      productEOLStatus ,
      currentProductSummaries,
      createdVsResolvedChart,
      casesByEnvironmentChart,
      createdByProductChart,
      incidentByPriorityChart,
        };

    // Render the HTML with data
    const renderedHtml = template(context);

    // Load HTML into Puppeteer
    await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A5',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      }
    });

    await browser.close();

    // Save the PDF
    const outputDir = path.join(__dirname, '../../generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `cs_report_${data.subscriptionDetails.projectKey}.pdf`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`✅ PDF successfully generated at: ${filePath}`);
    return filePath;
  }
}

