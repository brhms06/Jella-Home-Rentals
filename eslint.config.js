// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Jest globals in tests and the shared test setup
    files: ["**/__tests__/**", "jest.setup.js"],
    languageOptions: { globals: { jest: "readonly", describe: "readonly", it: "readonly", expect: "readonly", beforeEach: "readonly" } },
  }
]);
