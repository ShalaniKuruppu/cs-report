import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { generateLineChart, generatePieChart ,generateGroupedBarChart} from './chart.util';


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
      const productList: string[] = [];
    
      deployments.forEach(env => {
        (env.products || []).forEach(p => {
          if (!productList.includes(p.name)) {
            productList.push(p.name);
          }
        });
      });
    
      return productList;
    });

    const productEOLStatus: { product: string; eolDate: string; supportStatus: string }[] = [];
    const duplicates = new Set();
    for (const env of data?.projectDeployments || []) {
      for (const p of env.products || []) {
        const key = `${p.name} v${p.version}`;
        if (!duplicates.has(key)) {
          duplicates.add(key);
          productEOLStatus.push({
            product: key,
            eolDate: p.eolDate ? new Date(p.eolDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : '—',
            supportStatus: p.supportStatus || 'Unknown'
          });
        }
      }
}
    // Extract and summarize current products usage (product and cores)
const currentProductSummaries: { label: string; value: string }[] = [];

for (const env of data.projectDeployments || []) {
  for (const p of env.products || []) {
    if (p.name && p.cores) {
      currentProductSummaries.push({
        label: p.name,
        value: `${p.cores} Cores`,
      })
    }
  }
}

// Grouped bar chart for Created vs Resolved Cases
const dailyStateCounts = new Map<string, { Open: number; Closed: number }>();

for (const record of data.casesRecords || []) {
  const day = record.opened?.split(' ')[0]; 
  const state = record.caseState;

  if (!day) continue;

  if (!dailyStateCounts.has(day)) {
    dailyStateCounts.set(day, { Open: 0, Closed: 0 });
  }

  const counts = dailyStateCounts.get(day);
  if (counts) {
    if (state === "Open") counts.Open++;
    if (state === "Closed") counts.Closed++;
  }
}

// Prepare data for chart
const sortedDays = Array.from(dailyStateCounts.keys()).sort();
const openedData = sortedDays.map(day => (dailyStateCounts.get(day)?.Open ?? 0));
const resolvedData = sortedDays.map(day => dailyStateCounts.get(day)?.Closed ?? 0);

// Generate grouped bar chart
const createdVsResolvedChart = await generateGroupedBarChart(
  sortedDays,
  [
    { label: "Opened", data: openedData },
    { label: "Resolved", data: resolvedData },
  ],
  "Created vs Resolved Cases",
  { chartType: "state" }
);

// Cases by Deployment Pie Chart
const casesByEnvironment = data.casesRecords.reduce((acc: any, caseData: any) => {
  const deployment = caseData.deployment;
  if (deployment && deployment !== "N/A") {
    acc[deployment] = (acc[deployment] || 0) + 1;
  }
  return acc;
}, {});

const environments = Object.keys(casesByEnvironment);
const environmentCounts = Object.values(casesByEnvironment);

// Generate Cases by Deployment Pie Chart
const casesByEnvironmentChart = await generatePieChart(environments, environmentCounts as number[]);

// === STEP 1: Aggregate product cases by month ===
const casesByMonthAndProduct = data.casesRecords.reduce(
  (acc: { [month: string]: { [product: string]: number } }, record: any) => {
    const openedDate = new Date(record.opened);
    const product = record.productName;

    // Skip if missing or "N/A"
    if (!product || product === "N/A" ) return acc;

    const monthKey = openedDate.toLocaleString('default', {
      month: 'short',
      year: 'numeric'
    });

    if (!acc[monthKey]) acc[monthKey] = {};
    if (!acc[monthKey][product]) acc[monthKey][product] = 0;

    acc[monthKey][product]++;
    return acc;
  },
  {}
);

// === STEP 2: Extract all month labels and product names ===
const monthLabels = Object.keys(casesByMonthAndProduct).sort((a, b) => {
  const [aMonth, aYear] = a.split('/');
  const [bMonth, bYear] = b.split('/');
  return new Date(`${aMonth} 1, ${aYear}`).getTime() - new Date(`${bMonth} 1, ${bYear}`).getTime();
});

const productSet = new Set<string>();
for (const month of monthLabels) {
  Object.keys(casesByMonthAndProduct[month]).forEach(product => productSet.add(product));
}
const allProducts = Array.from(productSet);

// === STEP 3: Build datasets ===
const productSeries = allProducts.map(product => ({
  label: product,
  data: monthLabels.map(month => casesByMonthAndProduct[month]?.[product] || 0)
}));

// === STEP 4: Generate grouped bar chart ===
const createdByProductChart = await generateGroupedBarChart(
  monthLabels,
  productSeries,
  "Cases Created by Product",
  { chartType: "product" }
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

// Step 1: Group by month and priority
const priorityMonthMap = new Map<string, Record<string, number>>();

for (const record of data.casesRecords || []) {
  const rawDate = record.opened?.split(" ")[0];
  const priority = record.casePriority;

  if (!rawDate || !priority || priority === "N/A") continue;

  const date = new Date(rawDate);
  const month = date.toLocaleString('default', { month: 'short', year: 'numeric' }).replace(" ", "/");

  if (!priorityMonthMap.has(month)) {
    priorityMonthMap.set(month, {});
  }

  const monthData = priorityMonthMap.get(month)!;
  monthData[priority] = (monthData[priority] || 0) + 1;
}

const priorityMonthLabels = Array.from(priorityMonthMap.keys()).sort(
  (a, b) => new Date(parseInt(a.split("/")[1]), new Date(Date.parse(a.split("/")[0] + " 1")).getMonth()).getTime() -
            new Date(parseInt(b.split("/")[1]), new Date(Date.parse(b.split("/")[0] + " 1")).getMonth()).getTime()
);

const allPriorities = Array.from(
  new Set(
    Array.from(priorityMonthMap.values()).flatMap(monthData => Object.keys(monthData))
  )
);

const prioritySeries = allPriorities.map(priority => ({
  label: priority,
  data: priorityMonthLabels.map(month => priorityMonthMap.get(month)?.[priority] || 0)
}));

const incidentByPriorityChart = await generateGroupedBarChart(
  priorityMonthLabels,
  prioritySeries,
  "Incident Created by Priority (Monthly)",
  { chartType: "priority" }
);


const logoImagePath = path.join(__dirname, '../../src/pdf/images/wso2-logo-orange.png');
const logoBase64 = fs.readFileSync(logoImagePath, { encoding: 'base64' });
const logoDataUri = `data:image/png;base64,${logoBase64}`;



    // Prepare context data
    const context = {
      ...data.subscriptionDetails,
      casesRecords: Array.isArray(data?.casesRecords) ? data.casesRecords : [],
      slaRecords: Array.isArray(data?.slaDetails?.slaRecords) ? data.slaDetails.slaRecords : [],
      projectDeployments: Array.isArray(data?.projectDeployments) ? data.projectDeployments : [],
      lineChartImage: new Handlebars.SafeString(`<img src="${chartImage}" alt="Monthly Case Volume Chart" width="1000"/>`),
      generatedDate: new Date().toISOString().split('T')[0],
      slaPerformanceStats: data?.slaDetails?.slaPerformanceStats || {},
      productEOLStatus ,
      currentProductSummaries,
      createdVsResolvedChart,
      casesByEnvironmentChart,
      createdByProductChart,
      incidentByPriorityChart,
      logo: logoDataUri,
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

    const fileName = `CS_REPORT_${data.subscriptionDetails.projectKey}.pdf`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`✅ PDF successfully generated at: ${filePath}`);
    return filePath;
  }
}

