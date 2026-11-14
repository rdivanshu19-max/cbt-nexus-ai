import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Supabase Edge Functions run on Deno, are not part of the Vite bundle and
    // are not type-checked by this project's tsconfig. Lint them with the Deno
    // global instead of the browser globals, and allow `any` because their
    // payloads are AI/JSON shaped and validated at runtime.
    files: ["supabase/functions/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { Deno: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
