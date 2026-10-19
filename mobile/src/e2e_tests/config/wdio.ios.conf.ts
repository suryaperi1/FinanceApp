import { APP_ID, config as env } from './env';
import { sharedConfig } from './wdio.shared.conf';

const ios = env.ios;

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': ios.deviceName,
      ...(ios.udid && { 'appium:udid': ios.udid }),
      ...(ios.platformVersion && { 'appium:platformVersion': ios.platformVersion }),
      // Install the given .app/.ipa, or launch the app that is already on the simulator.
      ...(ios.app ? { 'appium:app': ios.app } : { 'appium:bundleId': APP_ID.ios }),
      'appium:autoAcceptAlerts': true,
      'appium:newCommandTimeout': 240,
      // First run builds WebDriverAgent, which can take several minutes.
      'appium:wdaLaunchTimeout': 240_000,
    },
  ],
};
