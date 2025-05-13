// src/pdf/chart.util.ts
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartTypeRegistry } from 'chart.js';

const width = 2400;
const height = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
interface ProductSeries {
  label: string;
  data: number[];
}


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
          borderColor: '#ff7300',
          backgroundColor: '#ff7300',
          tension:0,
          borderWidth: 2,
          fill: false,
        },
        {
          label: 'Queries',
          data: queries,
          borderColor: '#25AAE1',
          backgroundColor:'#25AAE1',
          fill: false,
          tension:0,
          borderWidth: 2,
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
export async function generateBarChart(labels: string[], data: number[], label: string): Promise<string> {
  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export async function generateGroupedBarChart(
  labels: string[],                 // e.g., ["Jul/2024", "Aug/2024", "Sep/2024"]
  productSeries: ProductSeries[],   // array of { label: "Product A", data: [1, 2, 3] }
  title: string                     // e.g., "Created by Product"
): Promise<string> {
  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets: productSeries.map(series => ({
        label: series.label,
        data: series.data,
        backgroundColor: ['rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',],
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
      })),
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Case Count',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Month',
          },
        },
      },
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export async function generatePieChart(labels: string[], data: number[]): Promise<string> {
  const config: ChartConfiguration<'pie'> = {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#1F84A6',
            '#25AAE1',
            '#3EB5E5',
            '#57C0E9',
            '#70CBED',
            '#8AD6F1',
            '#A2E1F5',
          ],
          borderColor:'#fff',
          borderWidth: 1
        },
      ],
    },
    options: {
      responsive: true,
    },
  };

  const buffer = await chartJSNodeCanvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}