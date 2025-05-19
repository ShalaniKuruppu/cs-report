/** Default f color palette */
export const DEFAULT_CHART_COLORS = [
  '#25AAE1',
  '#3EB5E5',
  '#57C0E9',
  '#2299CC',
  '#1F84A6',
  '#1A6D8B',
  '#70CBED',
  '#FFD166',
];

/** Grey color used for "Unknown" or fallback cases */
export const GREY_COLOR = '#999999';

/** Predefined colors for products */
export const PRODUCT_COLOR_MAP: Record<string, string> = {
  'WSO2 API Manager': '#25AAE1',
  'WSO2 API Manager Analytics': '#3EB5E5',
  'WSO2 API Platform for Kubernetes': '#57C0E9',
  'Ballerina': '#2299CC',
  'WSO2 Enterprise Integrator': '#1F84A6',
  'WSO2 Identity Server': '#1A6D8B',
  'WSO2 Micro Integrator': '#70CBED',
  Unknown: GREY_COLOR,
};

/** Predefined colors for state labels */
export const STATE_COLOR_MAP: Record<string, string> = {
  Opened: '#25AAE1',
  Resolved: '#1A6D8B',
};

/** Default background colors for pie chart segments */
export const PIE_CHART_COLORS = [
  '#1F84A6',
  '#25AAE1',
  '#3EB5E5',
  '#57C0E9',
  '#70CBED',
  '#8AD6F1',
  '#A2E1F5',
];