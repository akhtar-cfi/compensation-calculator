import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/", "dist/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/engine/**/*.ts"],
    rules: {
      // The engine must stay pure: no clock, no I/O. Dates are passed in.
      "no-restricted-globals": ["error", { name: "Date", message: "Pass dates in; the engine is pure." }],
      "no-restricted-imports": ["error", { patterns: ["node:*", "fs", "path"] }],
    },
  },
);
