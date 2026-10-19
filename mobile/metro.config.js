// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Appium/WebdriverIO suite in src/e2e_tests has its own node_modules and is never
// bundled into the app, so keep Metro from crawling it.
const e2eTests = /[\\/]src[\\/]e2e_tests[\\/].*/;
const existing = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), e2eTests];

module.exports = config;
