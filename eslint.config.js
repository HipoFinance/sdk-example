import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

// Flat config, replacing the old .eslintrc.cjs. ESLint 10 dropped .eslintrc.* support entirely, so
// the previous file was not merely outdated -- it could not be loaded at all, and `npm run lint`
// failed before it linted anything.
//
// The old file also extended plugin:react/recommended, plugin:react/jsx-runtime and prettier while
// eslint-plugin-react and eslint-config-prettier were never in devDependencies, so those three
// extends had been unresolvable for far longer than the ESLint 10 bump. eslint-config-prettier is
// now installed and applied below. eslint-plugin-react is deliberately NOT restored: its latest
// release (7.37.5) declares a peer range topping out at eslint ^9.7 and calls context.getFilename(),
// which ESLint 10 removed, so it cannot run here. Revisit if that plugin ships an ESLint 10 release.
export default tseslint.config(
    { ignores: ['dist'] },

    // Application source: full type-aware linting.
    {
        files: ['src/**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
            reactHooks.configs.flat.recommended,
            // Last, so it wins: turns off every rule Prettier already decides.
            prettier,
        ],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.browser,
            parserOptions: {
                project: ['./tsconfig.json', './tsconfig.node.json'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: { 'react-refresh': reactRefresh },
        rules: {
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        },
    },

    // Root config files. eslint.config.js is in no tsconfig `include`, and type-aware rules error on
    // any file outside a project, so type checking is switched off here. disableTypeChecked only
    // toggles rules -- it sets no parser -- hence the explicit one, without which tailwind.config.ts
    // fails to parse `import type`.
    {
        files: ['*.{ts,js}'],
        extends: [js.configs.recommended, tseslint.configs.disableTypeChecked, prettier],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.node,
            parser: tseslint.parser,
        },
    },
)
