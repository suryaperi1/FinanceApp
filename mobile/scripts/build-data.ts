/// <reference types="node" />
/**
 * Build-time data step: reads the Red30 Tech workbooks in ../Spreadsheets and
 * writes the aggregated dashboard dataset to src/data/dashboard.json.
 *
 * Run with:
 *
 *     npm run build:data
 *
 * It also runs automatically before `npm start` / `npm run android` / `ios`.
 * The parsing mirrors dashboard.py: the corporate workbooks have a title
 * block of varying height, so the header row is located by content (a run of
 * years, month names, or month dates) rather than by a fixed row number.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

import type {
  BarItem,
  DashboardData,
  Kpi,
  StackChartData,
  TrendPoint,
} from '../src/types/dashboard';

XLSX.set_fs(fs);

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.RED30_DATA_DIR
  ? path.resolve(process.env.RED30_DATA_DIR)
  : path.resolve(ROOT, '..', 'Spreadsheets');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'dashboard.json');

/** Corporate workbooks are stated in thousands of US dollars. */
const THOUSANDS = 1000;

const MONTHS = new Set([
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
]);
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Cell = string | number | boolean | Date | null;

// ---------------------------------------------------------------------------
// Workbook access
// ---------------------------------------------------------------------------

function openWorkbook(file: string): XLSX.WorkBook {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing workbook: ${full}`);
  }
  return XLSX.readFile(full, { cellDates: true });
}

/** Sheet names in some workbooks carry stray whitespace (e.g. "Business "). */
function getSheet(wb: XLSX.WorkBook, name: string): XLSX.WorkSheet {
  const actual = wb.SheetNames.find((s) => s.trim() === name);
  if (!actual) {
    throw new Error(`Sheet "${name}" not found (have: ${wb.SheetNames.join(', ')})`);
  }
  return wb.Sheets[actual];
}

function sheetRows(ws: XLSX.WorkSheet): Cell[][] {
  return XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, defval: null, raw: true, blankrows: true, UTC: true });
}

/** Records keyed by trimmed header text (e.g. "EmpID " -> "EmpID"). */
function sheetRecords(ws: XLSX.WorkSheet): Record<string, Cell>[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, Cell>>(ws, { defval: null, raw: true, UTC: true });
  return raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), v])));
}

// ---------------------------------------------------------------------------
// Titled-sheet parsing (five-year review, budget, expense workbooks)
// ---------------------------------------------------------------------------

interface TableRow {
  item: string;
  /** Most recent section header above this row (e.g. "Executive", "Assets"). */
  section: string;
  values: (number | null)[];
}

interface Table {
  periods: string[];
  rows: TableRow[];
}

function isYearSequence(vals: Cell[]): boolean {
  const ints = [...new Set(vals.filter((v): v is number => typeof v === 'number' && Number.isInteger(v)))].sort(
    (a, b) => a - b,
  );
  if (ints.length < 2) return false;
  const span = ints[ints.length - 1] - ints[0];
  return ints[0] >= 2000 && ints[ints.length - 1] <= 2100 && span === ints.length - 1 && span <= 6;
}

function findHeaderRow(rows: Cell[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const vals = rows[i].filter((v) => v !== null && v !== '');
    if (vals.length < 3) continue;
    const dateLike = vals.filter((v) => v instanceof Date).length;
    const monthLike = vals.filter((v) => typeof v === 'string' && MONTHS.has(v.trim())).length;
    if (dateLike >= 3 || monthLike >= 3 || isYearSequence(vals)) return i;
  }
  throw new Error('Could not locate a header row in sheet');
}

function periodLabel(v: Cell): string {
  if (v instanceof Date) return `${SHORT_MONTHS[v.getUTCMonth()]} ${v.getUTCFullYear()}`;
  if (typeof v === 'number') return String(Math.trunc(v));
  return String(v ?? '').trim();
}

function toNumber(v: Cell): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

/**
 * Parse a title-block sheet into labeled rows. Rows from `startRow` (default:
 * the detected header) until `stopAtItem` are included; rows with no numeric
 * values become section headers for the rows beneath them.
 */
function loadTitledSheet(ws: XLSX.WorkSheet, opts: { stopAtItem?: string; scale?: number } = {}): Table {
  const rows = sheetRows(ws);
  const h = findHeaderRow(rows);
  const width = rows[h].length;
  const periods = rows[h].slice(1, width).map(periodLabel);
  const scale = opts.scale ?? 1;

  const out: TableRow[] = [];
  let section = '';
  for (const r of rows.slice(h + 1)) {
    const item = String(r[0] ?? '').trim();
    if (!item) continue;
    if (opts.stopAtItem && item === opts.stopAtItem) break;
    const values = periods.map((_, j) => {
      const n = toNumber(r[j + 1] ?? null);
      return n === null ? null : n * scale;
    });
    if (values.every((v) => v === null)) {
      section = item;
      continue;
    }
    out.push({ item, section, values });
  }
  return { periods, rows: out };
}

function findRow(table: Table, item: string, section?: string): TableRow {
  const row = table.rows.find((r) => r.item === item && (section === undefined || r.section === section));
  if (!row) throw new Error(`Row "${item}"${section ? ` in section "${section}"` : ''} not found`);
  return row;
}

function valueAt(table: Table, item: string, period: string): number {
  const idx = table.periods.indexOf(period);
  if (idx < 0) throw new Error(`Period "${period}" not found (have: ${table.periods.join(', ')})`);
  const v = findRow(table, item).values[idx];
  if (v === null) throw new Error(`No value for "${item}" in ${period}`);
  return v;
}

/** Value-carrying periods, with any trailing "Total"/"Totals" column dropped. */
function dataPeriods(table: Table): string[] {
  return table.periods.filter((p) => p && !p.toLowerCase().startsWith('total'));
}

function totalPeriod(table: Table): string {
  const p = table.periods.find((x) => x.toLowerCase().startsWith('total'));
  if (!p) throw new Error('No Total column in sheet');
  return p;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function sumBy<T>(items: T[], key: (t: T) => string, val: (t: T) => number): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    m.set(k, (m.get(k) ?? 0) + val(it));
  }
  return m;
}

function rankDesc(m: Map<string, number>): BarItem[] {
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function asDate(v: Cell): Date {
  if (v instanceof Date) return v;
  throw new Error(`Expected a date, got ${JSON.stringify(v)}`);
}

function monthYear(d: Date): string {
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Most recent year-named sheet in a workbook (e.g. "2018"). */
function latestYearSheet(wb: XLSX.WorkBook): string {
  const years = wb.SheetNames.map((s) => s.trim()).filter((s) => /^\d{4}$/.test(s)).sort();
  if (!years.length) throw new Error('No year sheets found');
  return years[years.length - 1];
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function buildCorporate() {
  const fs5 = openWorkbook('Financial Statement.xlsx');
  const income = loadTitledSheet(getSheet(fs5, 'Sheet1'), { stopAtItem: 'Balance Sheet', scale: THOUSANDS });
  const years = dataPeriods(income);
  const latest = years[years.length - 1];

  const budget = loadTitledSheet(getSheet(openWorkbook('Budget.xlsx'), 'Sheet1'), { scale: THOUSANDS });
  const budgetTotal = totalPeriod(budget);
  const budgetYear = String(Number(latest) + 1);
  const budgetLabel = `${budgetYear}B`;

  const revenue = (y: string) => valueAt(income, 'Gross Revenue', y);
  const netIncome = (y: string) => valueAt(income, 'Net Income', y);
  const grossProfit = (y: string) => valueAt(income, 'Gross Profit', y);

  const bRevenue = valueAt(budget, 'Gross Revenue', budgetTotal);
  const bNetIncome = valueAt(budget, 'Net Income', budgetTotal);
  const bGrossProfit = valueAt(budget, 'Gross Profit', budgetTotal);

  const trend = (fn: (y: string) => number, forecast: number): TrendPoint[] => [
    ...years.map((y) => ({ label: y, value: round(fn(y)) })),
    { label: budgetLabel, value: round(forecast), forecast: true },
  ];

  const financialPerformance = {
    note: `${years[0]}–${latest} actual, ${budgetYear} budget shown as forecast point`,
    grossRevenue: trend(revenue, bRevenue),
    netIncome: trend(netIncome, bNetIncome),
    grossMargin: trend((y) => (grossProfit(y) / revenue(y)) * 100, (bGrossProfit / bRevenue) * 100),
  };

  // Balance sheet composition (five-year review)
  const bs = loadTitledSheet(getSheet(openWorkbook('Balance Sheet.xlsx'), '5 year review'), { scale: THOUSANDS });
  const bsYears = dataPeriods(bs);
  const sumItems = (items: string[]) =>
    bsYears.map((y) => round(items.reduce((acc, it) => acc + valueAt(bs, it, y), 0)));

  const assets: StackChartData = {
    categories: bsYears,
    series: [
      { name: 'Cash', values: sumItems(['Cash']) },
      {
        name: 'Working Capital (AR + Inventory + Prepaid)',
        values: sumItems(['Accounts Receivable', 'Inventories', 'Prepaid Expenses']),
      },
      {
        name: 'Long-Term Assets (PP&E + Investments + Goodwill + Other)',
        values: sumItems(['Property Plant and Equipment (PP&E)', 'Investments', 'Goodwill', 'Other Assets']),
      },
    ],
  };
  const liabilitiesEquity: StackChartData = {
    categories: bsYears,
    series: [
      { name: 'Liabilities', values: sumItems(['Total Liabilities']) },
      { name: 'Equity', values: sumItems(['Total Equity']) },
    ],
  };

  // Expense detail — latest year tab in each workbook
  const laborWb = openWorkbook('Labor Expenses.xlsx');
  const expenseYear = latestYearSheet(laborWb);
  const labor = loadTitledSheet(getSheet(laborWb, expenseYear), { scale: THOUSANDS });
  const marketing = loadTitledSheet(getSheet(openWorkbook('Marketing Expenses.xlsx'), expenseYear), {
    scale: THOUSANDS,
  });
  const overhead = loadTitledSheet(getSheet(openWorkbook('Overhead Costs.xlsx'), expenseYear), { scale: THOUSANDS });

  const laborTotalCol = labor.periods.indexOf(totalPeriod(labor));
  const marketingTotalCol = marketing.periods.indexOf(totalPeriod(marketing));
  const overheadTotalCol = overhead.periods.indexOf(totalPeriod(overhead));

  // Each department block ends in "Total <Dept> Labor"; label it by its section header.
  const laborByDept: BarItem[] = labor.rows
    .filter((r) => /^Total .+ Labor$/.test(r.item) && r.section)
    .map((r) => ({ label: r.section, value: round(r.values[laborTotalCol] ?? 0) }))
    .sort((a, b) => b.value - a.value);

  const marketingCategories: [string, string][] = [
    ['Total Labor', 'Marketing Labor'],
    ['Total Advertising', 'Advertising'],
    ['Total Social Media', 'Social Media'],
    ['Total Public Relations', 'Public Relations'],
    ['Total Market Research', 'Market Research'],
  ];
  const marketingByCat: BarItem[] = marketingCategories
    .map(([item, label]) => ({ label, value: round(findRow(marketing, item).values[marketingTotalCol] ?? 0) }))
    .sort((a, b) => b.value - a.value);

  const overheadMajor = [
    'Salaries and Wages', 'Rent', 'Marketing and Advertising', 'Utilities', 'Taxes',
    'Research and Development', 'Interest', 'Travel',
  ];
  const overheadMinor = ['Supplies', 'Insurance', 'Phone and Internet', 'Maintenance', 'Depreciation'];
  const ohValue = (item: string) => findRow(overhead, item).values[overheadTotalCol] ?? 0;
  const overheadByCat: BarItem[] = [
    ...overheadMajor.map((item) => ({ label: item, value: round(ohValue(item)) })).sort((a, b) => b.value - a.value),
    {
      label: 'Other (Supplies/Insurance/Phone/Maint./Depr.)',
      value: round(overheadMinor.reduce((acc, it) => acc + ohValue(it), 0)),
    },
  ];

  const laborTotal = findRow(labor, 'Total Labor Expenses').values[laborTotalCol] ?? 0;
  const marketingTotal = findRow(marketing, 'Marketing Totals').values[marketingTotalCol] ?? 0;
  const overheadTotal = findRow(overhead, 'Overhead Costs Total').values[overheadTotalCol] ?? 0;
  const salariesOnIncome = valueAt(income, 'Salaries and Wages', expenseYear);

  const kpis: Kpi[] = [
    { label: `${latest} Revenue`, value: revenue(latest), format: 'usd', sub: `Corporate financials, FY${latest}` },
    {
      label: `${latest} Net Income`,
      value: netIncome(latest),
      format: 'usd',
      sub: `${((netIncome(latest) / revenue(latest)) * 100).toFixed(1)}% net margin`,
    },
    {
      label: `${budgetYear} Budget Growth`,
      value: (bRevenue / revenue(latest) - 1) * 100,
      format: 'signedPct',
      sub: `vs. FY${latest} actual revenue`,
    },
    {
      label: `${expenseYear} Labor Cost`,
      value: laborTotal,
      format: 'usd',
      sub: `${laborByDept.length} departments, incl. contractors`,
    },
    { label: `${expenseYear} Marketing Spend`, value: marketingTotal, format: 'usd', sub: 'Labor + paid activities' },
    { label: `${expenseYear} Overhead Cost`, value: overheadTotal, format: 'usd', sub: 'Variable + fixed costs' },
  ];

  const balanceRow = (() => {
    try {
      return findRow(bs, 'Balance check').values.filter((v): v is number => v !== null);
    } catch {
      return [];
    }
  })();

  return {
    years,
    latest,
    budgetYear,
    kpis,
    financialPerformance,
    balanceSheet: {
      note: `Five-year review, ${bsYears[0]}–${bsYears[bsYears.length - 1]} · shared scale across both charts`,
      assets,
      liabilitiesEquity,
    },
    expenses: {
      year: expenseYear,
      note: `FY${expenseYear} detail from the Labor, Marketing and Overhead workbooks`,
      labor: laborByDept,
      marketing: marketingByCat,
      overhead: overheadByCat,
    },
    laborTiesOut: Math.abs(laborTotal - salariesOnIncome) < THOUSANDS,
    laborTotal,
    balanceCheckMax: balanceRow.length ? Math.max(...balanceRow.map(Math.abs)) : 0,
  };
}

function buildEcommerce() {
  const online = sheetRecords(getSheet(openWorkbook('US Online Retail Sales.xlsx'), 'Sheet1'));
  const regionWb = openWorkbook('US Sales by Region.xlsx');
  const regional = sheetRecords(getSheet(regionWb, 'US Sales by Region'));

  const total = (r: Record<string, Cell>) => toNumber(r['Order Total']) ?? 0;
  const dates = online.map((r) => asDate(r['OrderDate']).getTime());
  const start = new Date(Math.min(...dates));
  const end = new Date(Math.max(...dates));
  const revenue = online.reduce((acc, r) => acc + total(r), 0);

  const byCategoryAll = rankDesc(sumBy(online, (r) => String(r['ProdCategory']), total));
  const TOP_CATEGORIES = 5;
  const byCategory = byCategoryAll.slice(0, TOP_CATEGORIES);
  const rest = byCategoryAll.slice(TOP_CATEGORIES);
  if (rest.length) {
    byCategory.push({ label: 'Other categories', value: rest.reduce((acc, b) => acc + b.value, 0) });
  }

  const roundItems = (items: BarItem[]) => items.map((b) => ({ ...b, value: round(b.value) }));
  const periodStart = monthYear(start);
  const periodEnd = monthYear(end);

  return {
    note: `${periodStart} – ${periodEnd}, ${online.length.toLocaleString('en-US')} orders`,
    orders: online.length,
    revenue: round(revenue),
    periodStart,
    periodEnd,
    byRegion: roundItems(rankDesc(sumBy(regional, (r) => String(r['Sales Region']), total))),
    byCategory: roundItems(byCategory),
    byChannel: roundItems(rankDesc(sumBy(online, (r) => String(r['OrderType']), total))),
    topReps: roundItems(rankDesc(sumBy(regional, (r) => String(r['Employee Name']), total)).slice(0, 5)),
  };
}

function buildProductCatalog() {
  const products = sheetRecords(getSheet(openWorkbook('Product Line.xlsx'), 'Sales Revenue'));
  const top = products
    .map((p) => ({
      label: `${String(p['ProdName']).trim()} (${String(p['ProdCategory']).trim()})`,
      value: round(toNumber(p['Revenue']) ?? 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  return {
    note: `Top revenue SKUs, separate ${products.length}-item catalog snapshot`,
    productCount: products.length,
    topProducts: top,
  };
}

function buildCustomers() {
  const wb = openWorkbook('Customer Lists.xlsx');
  const count = (sheet: string) => sheetRecords(getSheet(wb, sheet)).filter((r) => r['CustID'] !== null).length;
  return { individual: count('Individual'), business: count('Business') };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const corp = buildCorporate();
  const ecommerce = buildEcommerce();
  const productCatalog = buildProductCatalog();
  const customers = buildCustomers();

  const workbooks = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'));
  // Use the newest workbook's modified time (not "now") so rebuilding unchanged data yields an identical file.
  const dataUpdatedAt = new Date(
    Math.max(...workbooks.map((f) => fs.statSync(path.join(DATA_DIR, f)).mtimeMs)),
  ).toISOString();

  const kpis: Kpi[] = [
    ...corp.kpis,
    {
      label: 'E-Commerce Orders',
      value: ecommerce.revenue,
      format: 'usd',
      sub: `${ecommerce.orders.toLocaleString('en-US')} orders, ${ecommerce.periodStart}–${ecommerce.periodEnd}`,
    },
    {
      label: 'Customers on File',
      value: customers.individual + customers.business,
      format: 'count',
      sub: `${customers.individual.toLocaleString('en-US')} individual + ${customers.business.toLocaleString('en-US')} business`,
    },
  ];

  const fmtM = (v: number) => `$${(v / 1e6).toFixed(1)}M`;
  const dataNotes = [
    `Corporate financials (Balance Sheet, Financial Statement, Budget, Labor/Marketing/Overhead Expenses) are stated in thousands of US dollars in the source files and are scaled to whole dollars here.` +
      (corp.laborTiesOut
        ? ` They tie together internally — e.g. ${corp.expenses.year} total labor expense (${fmtM(corp.laborTotal)}) matches the Salaries and Wages line in the Financial Statement.`
        : ''),
    'The e-commerce transaction files and the Product Line catalog are a separate dataset, in actual dollars, and do not reconcile to the corporate financial statements — treat them as an operational/CRM snapshot, not GAAP-consistent revenue.',
    ...(corp.balanceCheckMax > 0
      ? [
          `The Balance Sheet's "Balance check" row never resolves to exactly zero (off by at most $${Math.round(corp.balanceCheckMax).toLocaleString('en-US')} in any year) — rounding artifacts in the source file, not a real imbalance.`,
        ]
      : []),
  ];

  const data: DashboardData = {
    dataUpdatedAt,
    subtitle:
      `Built from the ${workbooks.length} workbooks in the Spreadsheets folder: five-year corporate financials ` +
      `(${corp.years[0]}–${corp.latest} + ${corp.budgetYear} budget), ${corp.expenses.year} expense detail, ` +
      `and e-commerce transaction history (${ecommerce.periodStart}–${ecommerce.periodEnd}).`,
    kpis,
    financialPerformance: corp.financialPerformance,
    balanceSheet: corp.balanceSheet,
    expenses: corp.expenses,
    ecommerce,
    productCatalog,
    dataNotes,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${path.relative(process.cwd(), OUT_FILE)} from ${DATA_DIR}`);
}

main();
