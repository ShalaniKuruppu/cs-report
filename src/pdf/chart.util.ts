// src/pdf/chart.util.ts
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartTypeRegistry } from 'chart.js';

const width = 2400;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export async function generateLineChart(monthlyCounts: any[]): Promise<string> {
  const labels = monthlyCounts.map((entry) => entry.yearAndMonth).reverse();
  const incidents = monthlyCounts.map((entry) => entry.counts.incidentCount).reverse();
  const queries = monthlyCounts.map((entry) => entry.counts.queryCount).reverse();

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Incidents',
          data: incidents,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
        },
        {
          label: 'Queries',
          data: queries,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Monthly Case Volume',
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
