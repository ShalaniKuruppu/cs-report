// src/pdf/chart.util.ts
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration} from 'chart.js';

interface ProductSeries {
  label: string;
  data: number[];
}

const getCanvas = (width = 2400, height = 1200): ChartJSNodeCanvas =>
  new ChartJSNodeCanvas({ width, height });

export async function generateLineChart(monthlyCounts: any[]): Promise<string> {
  const labels = monthlyCounts.map((entry) => entry.yearAndMonth).reverse();
  const incidents = monthlyCounts.map((entry) => entry.counts.incidentCount).reverse();
  const queries = monthlyCounts.map((entry) => entry.counts.queryCount).reverse();
  const canvas = getCanvas(2400, 1700);

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
   
  };

  const buffer = await canvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export async function generateGroupedBarChart(
  labels: string[],
  productSeries: ProductSeries[],
  title: string,
  options?: {
    chartType?: 'product' | 'priority' | 'state';
  }
): Promise<string> {
  const chartType = options?.chartType;

  const greyColor = "#999999";
  const defaultColors = [
    "#25AAE1", "#3EB5E5", "#57C0E9", "#2299CC",
    "#1F84A6", "#1A6D8B", "#70CBED", "#FFD166"
  ];
   const canvas = getCanvas(Math.max(labels.length, 800), 200);

  // Define custom color logic by chart type
  let datasets: any[] = [];

  if (chartType === "product") {
    const productColors: Record<string, string> = {
      "WSO2 API Manager": "#25AAE1",
      "WSO2 API Manager Analytics": "#3EB5E5",
      "WSO2 API Platform for Kubernetes": "#57C0E9",
      "Ballerina": "#2299CC",
      "WSO2 Enterprise Integrator": "#1F84A6",
      "WSO2 Identity Server": "#1A6D8B",
      "WSO2 Micro Integrator": "#70CBED",
      "Unknown": greyColor,
    };
  
    datasets = productSeries.map((series, index) => {
      const label = series.label?.trim() || "Unknown";
      const color = productColors[label] || defaultColors[index % defaultColors.length];
  
      return {
        label,
        data: series.data,
        backgroundColor: color,
        borderColor: "rgba(0,0,0,0.1)",
        borderWidth: 1,
      };
    });
  }
  
  else if (chartType === "priority") {
    datasets = productSeries.map((series, index) => ({
      label: series.label,
      data: series.data,
      backgroundColor: series.label === "Unknown" ? greyColor : defaultColors[index % defaultColors.length],
      borderWidth: 1
    }));
  }

  else if (chartType === "state") {
    const stateColors: Record<string, string> = {
      Opened: "#25AAE1",
      Resolved: "#1A6D8B"
    };

    datasets = productSeries.map((series) => ({
      label: series.label,
      data: series.data,
      backgroundColor: stateColors[series.label] || greyColor,
      borderWidth: 1
    }));
  }

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text:
            chartType === "state"
              ? "Created vs Resolved Cases"
              : chartType === "priority"
              ? "Cases Created by Priority"
              : "Cases Created by Product",
        },
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: chartType === "state" ? "Days" : "Months",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Cases",
          },
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  };

  const buffer = await canvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function generatePieChart(labels: string[], data: number[]): Promise<string> {
  const canvas = getCanvas(2400, 1200);
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
  const buffer = await canvas.renderToBuffer(config);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}