import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  {
    ignores: [
      "src/generated/**",
      "dist/**",
      "eslint.config.ts",
      "prisma.config.ts",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],

    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
      },
    },

    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".ts"],
          paths: ["./src"],
        },
      },
    },

    plugins: {
      import: importPlugin,
      "@typescript-eslint": tseslint.plugin,
    },

    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    rules: {
      ...prettierConfig.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "import/no-unresolved": "error",
      "import/named": "error",
      "import/no-duplicates": "error",
      "eslint-disable-next-line import/no-unresolved": "off",
    },
  },
]);
