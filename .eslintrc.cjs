module.exports = {
  root: true,
  ignorePatterns: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**", "**/.turbo/**"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: {
    node: true,
    es2022: true,
  },
  settings: {
    next: {
      rootDir: ["apps/app", "apps/admin", "apps/client", "apps/landing"],
    },
  },
  globals: {
    TextEncoder: "readonly",
    TextDecoder: "readonly",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-case-declarations": "off",
  },
};
