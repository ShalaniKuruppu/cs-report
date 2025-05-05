import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import { generateLineChart } from './chart.util';

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
      currentProductSummaries
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
