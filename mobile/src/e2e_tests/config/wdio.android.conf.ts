import { ANDROID_LAUNCH_ACTIVITY, APP_ID, config as env } from './env';
import { sharedConfig } from './wdio.shared.conf';

const android = env.android;

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': android.deviceName,
      ...(android.udid && { 'appium:udid': android.udid }),
      ...(android.platformVersion && { 'appium:platformVersion': android.platformVersion }),
      // Boot this emulator if it isn't running (a cold boot can take a couple of minutes).
      ...(android.avd && { 'appium:avd': android.avd, 'appium:avdLaunchTimeout': 180_000 }),
      // Install the given .apk, or launch the app that is already on the device.
      ...(android.app
        ? { 'appium:app': android.app }
        : { 'appium:appPackage': APP_ID.android, 'appium:appActivity': ANDROID_LAUNCH_ACTIVITY }),
      'appium:appWaitActivity': '*',
      'appium:autoGrantPermissions': true,
      'appium:newCommandTimeout': 240,
    },
  ],
};
