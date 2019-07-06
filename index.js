const applyNeutrinoPatches = require('neutrino-patch');

module.exports = () => (neutrino) => {
  applyNeutrinoPatches(neutrino);

  neutrino.addSupportedExtensions('ts', 'tsx');
  neutrino.tapAtEnd('compile', 'babel', (options) => {
    options.presets.push(['@babel/preset-typescript', {}]);
    options.plugins.push(['@babel/plugin-proposal-class-properties', {}]);
    options.plugins.push(['@babel/plugin-proposal-object-rest-spread', {}]);
    return options;
  });
};
