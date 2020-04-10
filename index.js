const applyNeutrinoPatches = require('neutrino-patch');
const generateDeclaration = require('./generateDeclaration');

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
    if (Array.isArray(entry) && entry.length > 1) {
      return entry[1];
    }
  } catch (ignore) {}
  return {};
}

module.exports = ({
  declaration = false,
  declarationMap = true,
  looseProperties = false,
  looseNullCheck = false,
  jsxPragma = null,
  onlyRemoveTypeImports = false,
} = {}) => (neutrino) => {
  applyNeutrinoPatches(neutrino);

  neutrino.addSupportedExtensions('ts', 'tsx');
  neutrino.tapAtEnd('compile', 'babel', (options) => {
    let resolvedJsxPragma = jsxPragma;
    if (resolvedJsxPragma === null) {
      const jsxConfig = getConfig(options.plugins, '@babel/plugin-transform-react-jsx');
      resolvedJsxPragma = jsxConfig.pragma || 'React';
    }
    addIfAbsent(options.presets, ['@babel/preset-typescript', {
      jsxPragma: resolvedJsxPragma,
      onlyRemoveTypeImports,
    }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-class-properties', { loose: looseProperties }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-nullish-coalescing-operator', { loose: looseNullCheck }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-object-rest-spread', {
      loose: looseProperties,
      useBuiltIns: looseProperties,
    }]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-optional-chaining', { loose: looseNullCheck }]);
    return options;
  });

  if (declaration) {
    neutrino.config.plugin('emitTypescriptDeclaration').use({
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('GenerateTypescriptDeclatation', () => {
          generateDeclaration(neutrino, declarationMap);
        });
      },
    });
  }
};
