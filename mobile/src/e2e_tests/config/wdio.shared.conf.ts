import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { config as env } from './env';

const reportsDir = path.resolve(import.meta.dirname, '../reports');
const screenshotsDir = path.join(reportsDir, 'screenshots');

/** Settings common to both platforms. Platform files add `capabilities`. */
export const sharedConfig: WebdriverIO.Config = {
  runner: 'local',
  tsConfigPath: path.resolve(import.meta.dirname, '../tsconfig.json'),

  specs: [path.resolve(import.meta.dirname, '../specs/**/*.spec.ts')],
  // One device at a time: specs run sequentially in a single session per spec file.
  maxInstances: 1,
  capabilities: [],

  logLevel: 'warn',
  outputDir: path.join(reportsDir, 'logs'),
  bail: 0,
  waitforTimeout: env.waitTimeout,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 1,

  services: [
    [
      'appium',
      {
        // Uses the Appium installed in this package's node_modules.
        args: { port: env.appiumPort, address: '127.0.0.1' },
        logPath: path.join(reportsDir, 'logs'),
      },
    ],
  ],
  port: env.appiumPort,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    // App install + first launch on a cold emulator can be slow.
    timeout: 180_000,
  },
  reporters: ['spec'],

  before() {
    mkdirSync(screenshotsDir, { recursive: true });
  },

  /** Save a screenshot for every failed test: reports/screenshots/<suite>--<test>.png */
  async afterTest(test, _context, { passed }) {
    if (passed) return;
    const name = `${test.parent} -- ${test.title}`.replace(/[^a-z0-9-]+/gi, '_').slice(0, 120);
    await browser.saveScreenshot(path.join(screenshotsDir, `${name}.png`));
  },
};
