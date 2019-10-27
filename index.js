const applyNeutrinoPatches = require('neutrino-patch');
const generateDeclaration = require('./generateDeclaration');

function hasEntryContaining(list, check) {
  return list
    .map((v) => Array.isArray(v) ? v[0] : v)
    .some((x) => x.includes(check[0]));
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
} = {}) => (neutrino) => {
  applyNeutrinoPatches(neutrino);

  neutrino.addSupportedExtensions('ts', 'tsx');
  neutrino.tapAtEnd('compile', 'babel', (options) => {
    addIfAbsent(options.presets, ['@babel/preset-typescript', {}]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-class-properties', {}]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-object-rest-spread', {}]);
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
