const applyNeutrinoPatches = require('neutrino-patch');

function hasEntryContaining(list, check) {
  const c = Array.isArray(check) ? check[0] : check;
  return list
    .map((v) => Array.isArray(v) ? v[0] : v)
    .some((x) => x.includes(c));
}

function addIfAbsent(list, entry) {
  if (!hasEntryContaining(list, entry)) {
    list.push(entry);
  }
}

module.exports = () => (neutrino) => {
  applyNeutrinoPatches(neutrino);

  neutrino.addSupportedExtensions('ts', 'tsx');
  neutrino.tapAtEnd('compile', 'babel', (options) => {
    addIfAbsent(options.presets, ['@babel/preset-typescript', {}]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-class-properties', {}]);
    addIfAbsent(options.plugins, ['@babel/plugin-proposal-object-rest-spread', {}]);
    return options;
  });
};
