import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", "release/", "node_modules/", ".claude/", ".superpowers/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}", "vite.config.js", "tailwind.config.js", "postcss.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Sans eslint-plugin-react, les composants utilisés en JSX ressemblent à des variables inutilisées.
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["electron/**/*.cjs", "scripts/**/*.cjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "commonjs", globals: globals.node },
    rules: {
      // Les paquets à champ `exports` refusent les sous-chemins (ERR_PACKAGE_PATH_NOT_EXPORTED).
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='require'][callee.property.name='resolve'][arguments.0.value=/^(@[a-z0-9._-]+[/][a-z0-9._-]+|[a-z0-9_-][a-z0-9._-]*)[/]./]",
          message: "require.resolve sur un sous-chemin de paquet casse avec `exports` : utiliser resolveBin() de scripts/resolve-bin.cjs.",
        },
      ],
    },
  },
];
