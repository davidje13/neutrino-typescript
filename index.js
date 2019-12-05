const applyNeutrinoPatches = require('neutrino-patch');
const generateDeclaration = require('./generateDeclaration');

function hasEntryContaining(list, check) {
  return list
    .map((v) => Array.isArray(v) ? v[0] : v)
    .some((x) => x.includes(require.resolve(check[0])));
}

function addIfAbsent(list, entry) {
  if (!hasEntryContaining(list, entry)) {
    entry[0] = require.resolve(entry[0]);
    list.push(entry);
  }
}

module.exports = ({
  declaration = false,
  declarationMap = true,
  looseProperties = false,
  looseNullCheck = false,
} = {}) => (neutrino) => {
  applyNeutrinoPatches(neutrino);

  neutrino.addSupportedExtensions('ts', 'tsx');
  neutrino.tapAtEnd('compile', 'babel', (options) => {
    addIfAbsent(options.presets, ['@babel/preset-typescript', {}]);
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
