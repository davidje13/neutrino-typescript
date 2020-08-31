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

function regexToGlob(glob) {
  // convert trivial regexes to globs
  let v = glob
    .replace(/\\(.)/g, (_, [v]) => `(--escaped${v.charCodeAt(0)}--)`)
    .replace(/\(/g, '@(');

  // convert all @(x)* to *(x), etc.
  for (let i = 0; i < 100; ++ i) {
    const oldV = v;
    v = v.replace(/^(.*)@\(([^()]+)\)(\*|\+|\?)(?!\()/g, '$1$3($2)');
    if (v === oldV) {
      break;
    }
  }

  return v
    .replace(/([^)])\*(?!\()/g, (_, [c]) => (c === '.' ? '*' : `*(${c})`))
    .replace(/([^)])\+(?!\()/g, (_, [c]) => (c === '.' ? '?*' : `+(${c})`))
    .replace(/([^)])\?(?!\()/g, '?($1)')
    .replace(/\./g, '?')
    .replace(/--escaped([^-]+)--/g, (_, [v]) => String.fromCharCode(v));
}

function unless(value, check) {
  return (value === check) ? undefined : value;
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

    const transformJsx = Boolean(getConfig(options.plugins, '@babel/plugin-transform-react-jsx'));
    const preserveJsx = Boolean(getConfig(options.plugins, '@babel/plugin-syntax-jsx'));

    return {
      ...tsconfig,
      compilerOptions: {
        ...compilerOptions,
        jsx: (transformJsx || preserveJsx) ? 'preserve' : undefined,
        jsxFactory: unless(resolvedJsxPragma.pragma, 'React.createElement'),
        jsxFragmentFactory: unless(resolvedJsxPragma.pragmaFrag, 'React.Fragment'),

        // handled elsewhere
        declaration: undefined,
        declarationMap: undefined,
      },
      include: Array.from(new Set([
        // format: https://www.npmjs.com/package/glob
        ...tsconfig.include || [],
        regexToGlob(relative(process.cwd(), neutrino.options.source)),
        regexToGlob(relative(process.cwd(), neutrino.options.tests)),
      ])),
    };
  });
};
