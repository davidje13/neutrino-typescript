const defaultCompilerOptions = {
  declarationMap: true,
  importsNotUsedAsValues: 'error',
};

const requiredCompilerOptions = {
  // required for babel compatibility
  target: 'esnext',
  module: 'esnext',
  moduleResolution: 'node',
  noEmit: true,
  isolatedModules: true,
  esModuleInterop: true,
  resolveJsonModule: true,
  allowSyntheticDefaultImports: undefined, // already enabled by esModuleInterop

  // not currently supported, but maybe possible to translate to babel config?
  baseUrl: undefined,
  paths: undefined,
  allowUmdGlobalAccess: undefined,
  preserveSymlinks: undefined,

  // options managed internally by generateDeclaration
  declarationDir: undefined,
  emitDeclarationOnly: undefined,

  // compiler flags which are unused (as tsc is not used for compilation)
  downlevelIteration: undefined,
  emitDecoratorMetadata: undefined,
  experimentalDecorators: undefined,
  importHelpers: undefined,
  inlineSourceMap: undefined,
  inlineSources: undefined,
  jsx: undefined,
  lib: undefined,
  mapRoot: undefined,
  outDir: undefined,
  outFile: undefined,
  removeComments: undefined,
  sourceMap: undefined,
  sourceRoot: undefined,
};

const errorDetail = {
  emitDecoratorMetadata: 'to enable decorator metadata, install and configure babel-plugin-transform-typescript-metadata instead - see https://github.com/davidje13/neutrino-typescript/issues/7 for details',
  experimentalDecorators: 'to enable decorators, install and configure @babel/plugin-proposal-decorators with {legacy: true} instead - see https://github.com/davidje13/neutrino-typescript/issues/7 for details',
};

function informDeprecated(oldKey, newKey, value, newValue = value, extra = '') {
  const oldConfig = { [oldKey]: value };
  const newConfig = { tsconfig: { compilerOptions: { [newKey]: newValue } } };
  console.warn(`typescript(${JSON.stringify(oldConfig)}) is deprecated; use typescript(${JSON.stringify(newConfig)}) instead${extra}`);
}

function getCompilerOptions(tsconfig, deprecated) {
  const compilerOptions = { ...tsconfig.compilerOptions };

  if (deprecated.declaration !== undefined) {
    informDeprecated('declaration', 'declaration', deprecated.declaration);
    if (compilerOptions.declaration === undefined) {
      compilerOptions.declaration = deprecated.declaration;
    }
  }
  if (deprecated.declarationMap !== undefined) {
    informDeprecated('declarationMap', 'declarationMap', deprecated.declarationMap);
    if (compilerOptions.declarationMap === undefined) {
      compilerOptions.declarationMap = deprecated.declarationMap;
    }
  }
  if (deprecated.onlyRemoveTypeImports !== undefined) {
    const equivalent = deprecated.onlyRemoveTypeImports ? 'preserve' : 'remove';
    informDeprecated(
      'onlyRemoveTypeImports',
      'importsNotUsedAsValues',
      deprecated.onlyRemoveTypeImports,
      equivalent,
      ', or specify "error" to ensure type imports are used correctly',
    );
    if (compilerOptions.importsNotUsedAsValues === undefined) {
      compilerOptions.importsNotUsedAsValues = equivalent;
    }
  }
  if (deprecated.jsxPragma !== undefined) {
    informDeprecated(
      'jsxPragma',
      'jsxFactory',
      deprecated.jsxPragma,
      deprecated.jsxPragma,
      ', or specify neither for auto-discovery',
    );
    if (compilerOptions.jsxFactory === undefined) {
      compilerOptions.jsxFactory = deprecated.jsxPragma + '.createElement';
    }
  }

  Object.keys(defaultCompilerOptions).forEach((k) => {
    if (compilerOptions[k] === undefined) {
      compilerOptions[k] = defaultCompilerOptions[k];
    }
  });

  Object.keys(requiredCompilerOptions).forEach((k) => {
    const fixedValue = requiredCompilerOptions[k];
    const userValue = compilerOptions[k];
    if (userValue !== undefined) {
      const ignoredConfig = { tsconfig: { compilerOptions: { [k]: userValue } } };
      let info = '';
      if (errorDetail[k]) {
        info = ` (${errorDetail[k]})`;
      } else if (fixedValue !== undefined) {
        info = ` (${k} is always ${JSON.stringify(fixedValue)})`;
      }
      console.warn(`typescript(${JSON.stringify(ignoredConfig)}) will be ignored${info}`);
    }
    compilerOptions[k] = fixedValue;
  });

  return compilerOptions;
}

module.exports = {
  getCompilerOptions,
};
