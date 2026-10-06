import type { DashboardData } from '../types/dashboard';
import raw from './dashboard.json';

/**
 * The dashboard dataset, generated from ../Spreadsheets by
 * `npm run build:data` (scripts/build-data.ts). Do not edit dashboard.json by
 * hand — change the workbooks and rebuild.
 */
export const dashboard = raw as DashboardData;
