import type { Href } from 'expo-router';

import { dashboard as d } from '../data';
import { fmtPct, fmtUsd } from './format';

export interface SectionLink {
  href: Href;
  title: string;
  /** One-line teaser shown on the consolidated dashboard button. */
  summary: string;
}

const last = <T,>(arr: T[]): T => arr[arr.length - 1];

function revenueSummary(): string {
  const actual = d.financialPerformance.grossRevenue.filter((p) => !p.forecast);
  const forecast = d.financialPerformance.grossRevenue.find((p) => p.forecast);
  return (
    `Revenue ${fmtUsd(last(actual).value)} in ${last(actual).label}` +
    (forecast ? ` · ${fmtUsd(forecast.value)} budget` : '')
  );
}

function assetsSummary(): string {
  const a = d.balanceSheet.assets;
  const i = a.categories.length - 1;
  const total = a.series.reduce((acc, s) => acc + s.values[i], 0);
  return `Total assets ${fmtUsd(total)} in ${a.categories[i]}`;
}

function ecommerceSummary(): string {
  const wholesale = d.ecommerce.byChannel.find((c) => c.label === 'Wholesale');
  const share = wholesale ? ` · ${fmtPct((wholesale.value / d.ecommerce.revenue) * 100)} wholesale` : '';
  return `${fmtUsd(d.ecommerce.revenue)} across ${d.ecommerce.orders.toLocaleString('en-US')} orders${share}`;
}

/** The five section dashboards, in the order they appear on the main page. */
export const SECTIONS = {
  financialPerformance: {
    href: '/financial-performance',
    title: 'Five-Year Financial Performance',
    summary: revenueSummary(),
  },
  balanceSheet: {
    href: '/balance-sheet',
    title: 'Balance Sheet Composition',
    summary: assetsSummary(),
  },
  expenses: {
    href: '/expenses',
    title: `${d.expenses.year} Expense Breakdown`,
    summary: `Labor, marketing & overhead · largest labor cost: ${d.expenses.labor[0]?.label ?? '—'}`,
  },
  ecommerce: {
    href: '/ecommerce',
    title: 'E-Commerce Sales Performance',
    summary: ecommerceSummary(),
  },
  productCatalog: {
    href: '/product-catalog',
    title: 'Product Catalog',
    summary: `Top SKU: ${d.productCatalog.topProducts[0]?.label ?? '—'}`,
  },
} satisfies Record<string, SectionLink>;

export const SECTION_LIST: SectionLink[] = Object.values(SECTIONS);
