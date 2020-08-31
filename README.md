# Neutrino Typescript

Transpiles TypeScript as part of the build process.

This follows the configuration suggested in
[the official TypeScript / Babel announcement](https://devblogs.microsoft.com/typescript/typescript-and-babel-7/).

## Installation

1. Install dependencies:

   ```bash
   npm install --save-dev neutrinojs-typescript typescript
   ```

   (note that `neutrino-typescript` in NPM - without `js` - is an unrelated package which is unmaintained).

2. Include in `.neutrinorc.js`:

   ```javascript
   const typescript = require('neutrinojs-typescript');
   // ...

   module.exports = {
     use: [
       typescript(), // must be first in use section
       // ...
       node(), // or whichever target you are using
     ],
   };
   ```

3. Include type checking in `package.json` scripts:

   ```json
   {
     "scripts": {
       "prebuild": "rewrite-tsconfig",
       "prelint": "rewrite-tsconfig",
       "lint": "tsc"
     }
   },
   ```

   To combine this with other linting steps, you can join the commands like so:

   ```json
   {
     "scripts": {
       "prebuild": "rewrite-tsconfig",
       "prelint": "rewrite-tsconfig",
       "lint": "existing lint command && tsc"
     }
   },
   ```

4. Run `npm run lint` to create the initial `tsconfig.json` file and test the
   integration.

### tsconfig.json

A `tsconfig.json` file will be generated automatcially by `rewrite-tsconfig`
and should be included in your repository. It does not have to be included
(the `prelint` script will generate it when needed), but including it is
recommended because many IDEs will look for it to configure their own type
checking.

If you prefer managing `tsconfig.json` yourself, simply remove
`rewrite-tsconfig` from your NPM scripts. You will need to ensure it remains
compatible with the webpack / babel configuration in `.neutrinorc.js`.

If you prefer using [tsconfig.js](https://www.npmjs.com/package/tsconfig.js)
(or a similar tsconfig-as-code tool), remove `rewrite-tsconfig` from your
NPM scripts and set the content of `tsconfig.js` to:

```javascript
const neutrino = require('neutrino');

module.exports = neutrino().tsconfig();
```

### Customisation

Since `rewrite-tsconfig` replaces any `tsconfig.json` file in the project
directory. You should specify customisations in `.neutrinorc.js` instead:

```javascript
const typescript = require('neutrinojs-typescript');

module.exports = {
  use: [
    typescript({ tsconfig: {
      compilerOptions: {
        strict: true,
        allowJs: true,
        importsNotUsedAsValues: 'remove', // legacy behaviour
        typeRoots: [
          'src/types', // custom types directory
          'node_modules/@types',
        ],
      },
      include: ['some-other-dir'], // sources and tests are included by default
    } }),
  ],
};
```

Some settings cannot be customised due to babel compatibility requirements.
If you attempt to change those settings, they will be ignored and a warning
will be printed.

### Generating declaration (`.d.ts`) files

If you are creating a library, you probably want to include a `.d.ts` file.
This can be turned on by specifying `declaration: true` as normal in the
tsconfig options:

```javascript
const typescript = require('neutrinojs-typescript');

module.exports = {
  use: [
    typescript({ tsconfig: {
      compilerOptions: {
        declaration: true,
        declarationMap: true, // defaults to true
      },
    } }),
  ],
};
```

One declaration file will be generated for each entrypoint you have specified
in `mains`. The file will be named to match the input file (for default
neutrino configuration, this means you will get `build/index.d.ts`).

## Linting with ESLint

If you want to use eslint with typescript, you can install the
[neutrinojs-typescript-eslint](https://github.com/davidje13/neutrino-typescript-eslint#readme) module.

## Testing with Jest

This will work out-of-the-box with Jest, but you will need to install the Jest types:

```bash
npm install --save-dev @types/jest
```
