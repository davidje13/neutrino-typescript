const { relative } = require('path');
const applyNeutrinoPatches = require('neutrino-patch');
const generateDeclaration = require('./generateDeclaration');
const { getCompilerOptions } = require('./compilerOptions');

function findEntry(list, resolvedPath) {
  return list.find((v) => (Array.isArray(v) ? v[0] : v) === resolvedPath);
}

function addIfAbsent(list, entry) {
  entry[0] = require.resolve(entry[0]);

  if (!findEntry(list, entry[0])) {
    list.push(entry);
  }
}

function getConfig(list, name) {
  try {
    const entry = findEntry(list, require.resolve(name));
    if (entry) {
      return (Array.isArray(entry) && entry.length > 1) ? entry[1] : {};
    }
  } catch (ignore) {}
  return null;
}

function regexToPaths(regex) {
  // convert trivial regexes to lists of paths for tsconfig compatibility
  // supports abc(def|ghi)jkl style regexes
  // anything more complex probably won't work
  // tsconfig supports basic glob patterns, but seems to be very limited in what they can do
  // (no support for {a,b} or @(a|b) etc.

  let patterns = [regex];
  for (let i = 0, changed = true; i < 100 && changed; ++ i) {
    const nextPatterns = [];
    changed = false;
    for (const pattern of patterns) {
      const match = /^(.*)\(([^()]+)\)(.*)$/.exec(pattern);
      if (match) {
        const choices = match[2].split('|');
        for (const choice of choices) {
          nextPatterns.push(match[1] + choice + match[3]);
        }
        changed = true;
        continue;
      }
      nextPatterns.push(pattern);
    }
    patterns = nextPatterns;
  }
  return patterns;
}

function unless(value, check) {
  return (value === check) ? undefined : value;
}

function stripUndefined(structure) {
  return JSON.parse(JSON.stringify(structure));
}

module.exports = ({
  looseProperties = false,
  looseNullCheck = false,
  tsconfig = {},
  ...deprecatedOptions
} = {}) => (neutrino) => {
  const compilerOptions = getCompilerOptions(tsconfig, deprecatedOptions);

  applyNeutrinoPatches(neutrino);

  function getJsxPragma(options) {
    const jsxConfig = getConfig(options.plugins, '@babel/plugin-transform-react-jsx') || {};
    const pragma = compilerOptions.jsxFactory || jsxConfig.pragma || 'React.createElement';
    const base = /^[^.]*/.exec(pragma)[0];
    const pragmaFrag = compilerOptions.jsxFragmentFactory || jsxConfig.pragmaFrag || `${base}.Fragment`;
    return { base, pragma, pragmaFrag };
  }

  neutrino.addSupportedExtensions('ts', 'tsx');
  neutrino.tapAtEnd('compile', 'babel', (options) => {
    const resolvedJsxPragma = getJsxPragma(options);
    addIfAbsent(options.presets, ['@babel/preset-typescript', {
      jsxPragma: resolvedJsxPragma.base,
      onlyRemoveTypeImports: (compilerOptions.importsNotUsedAsValues !== 'remove'),
    }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-class-properties', { loose: looseProperties }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-nullish-coalescing-operator', { loose: looseNullCheck }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-logical-assignment-operators']);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-object-rest-spread', {
      loose: looseProperties,
      useBuiltIns: looseProperties,
    }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-optional-chaining', { loose: looseNullCheck }]);
    return options;
  });

  if (compilerOptions.declaration) {
    neutrino.config.plugin('emitTypescriptDeclaration').use({
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('GenerateTypescriptDeclatation', () => {
          generateDeclaration(neutrino, compilerOptions.declarationMap);
        });
      },
    });
  }

  neutrino.register('tsconfig', (neutrino) => {
    const compileRule = neutrino.config.module.rules.get('compile');
    const options = compileRule ? compileRule.use('babel').get('options') : {};
    const resolvedJsxPragma = getJsxPragma(options);

    // TODO: currently have to check presets as well as plugins because presets can include plugins
    // - would be better if we could resolve the final list of plugins; maybe @babel/core has an API for this?
    const useJsx = (
      Boolean(getConfig(options.plugins, '@babel/plugin-transform-react-jsx')) ||
      Boolean(getConfig(options.plugins, '@babel/plugin-syntax-jsx')) ||
      Boolean(getConfig(options.presets, '@babel/preset-react')) ||
      (compilerOptions.jsxFactory !== undefined) // escape hatch if auto-detection fails
    );

    const decorators = Boolean(getConfig(options.plugins, '@babel/plugin-proposal-decorators'));
    const metadataDecorators = Boolean(getConfig(options.plugins, 'babel-plugin-transform-typescript-metadata'));

    return stripUndefined({
      ...tsconfig,
      compilerOptions: {
        ...compilerOptions,
        jsx: useJsx ? 'preserve' : undefined,
        jsxFactory: unless(resolvedJsxPragma.pragma, 'React.createElement'),
        jsxFragmentFactory: unless(resolvedJsxPragma.pragmaFrag, 'React.Fragment'),

        experimentalDecorators: decorators || undefined,
        emitDecoratorMetadata: metadataDecorators || undefined,

        // handled elsewhere
        declaration: undefined,
        declarationMap: undefined,
      },
      include: Array.from(new Set([
        ...tsconfig.include || [],
        ...regexToPaths(relative(process.cwd(), neutrino.options.source)),
        ...regexToPaths(relative(process.cwd(), neutrino.options.tests)),
      ])),
    });
  });
};
