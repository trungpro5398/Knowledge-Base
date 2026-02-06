/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["import"],
  extends: ["eslint:recommended"],
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/coverage/**",
    "**/build/**",
    "**/.turbo/**",
    "**/tsconfig.tsbuildinfo",
    "supabase/**",
    ".pnpm-store/**",
  ],
  settings: {
    "import/resolver": {
      typescript: {
        project: [
          "./apps/web/tsconfig.json",
          "./apps/api/tsconfig.json",
          "./packages/shared/tsconfig.json",
        ],
      },
      node: true,
    },
  },
  rules: {
    "no-alert": "off",
    "no-debugger": "error",
    "no-duplicate-imports": "error",
    "no-empty": "off",
    "prefer-const": ["error", { destructuring: "all" }],
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "import/no-unresolved": "off",
    "import/no-duplicates": "error",
  },
  overrides: [
    {
      files: ["apps/web/**/*.{js,jsx,ts,tsx}"],
      extends: ["next/core-web-vitals"],
      env: {
        browser: true,
        node: true,
      },
      rules: {
        "@next/next/no-img-element": "off",
      },
    },
    {
      files: ["apps/api/**/*.ts", "packages/shared/**/*.ts", "apps/web/**/*.{ts,tsx}"],
      rules: {
        "no-unused-vars": "off",
        "no-undef": "off",
      },
    },
    {
      files: ["apps/api/**/*.ts", "packages/shared/**/*.ts"],
      extends: ["plugin:import/recommended", "plugin:import/typescript"],
      rules: {
        "import/first": "error",
        "import/newline-after-import": "error",
      },
    },
    {
      files: ["**/*.js", "**/*.cjs"],
      parserOptions: {
        sourceType: "script",
      },
      rules: {
        "no-unused-vars": "off",
      },
    },
  ],
};
