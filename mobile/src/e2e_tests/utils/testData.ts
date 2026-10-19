import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Shapes of the JSON files in ../data. Update these when you add fields to the data. */
export interface ChartData {
  title: string;
  testId: string;
}

export interface SectionData {
  title: string;
  navTestId: string;
  charts: ChartData[];
}

export interface DashboardData {
  consolidatedDashboard: { title: string; titleKeyword: string };
  sections: { financialPerformance: SectionData };
}

const dataDir = path.resolve(import.meta.dirname, '../data');

/** Read and parse a JSON file from the data folder, e.g. `loadData<DashboardData>('dashboard')`. */
export function loadData<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(dataDir, `${name}.json`), 'utf-8')) as T;
}

export const dashboardData = loadData<DashboardData>('dashboard');
