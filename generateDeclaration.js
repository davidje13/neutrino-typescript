const typescript = require('typescript');

module.exports = function(neutrino, declarationMap) {
  const rawOptions = typescript.getDefaultCompilerOptions();
  const sources = Object.values(neutrino.options.mains).map((entry) => {
    if (typeof entry === 'object') {
      return entry.entry;
    }
    return entry;
  });

  const options = {
    ...rawOptions,
    noEmit: false, // this might not be needed any more
    isolatedModules: false, // https://github.com/microsoft/TypeScript/issues/29490 (fixed in 3.6.4+)
    declaration: true,
    emitDeclarationOnly: true,
    declarationMap,
    declarationDir: neutrino.options.output,
  };

  typescript.createProgram(sources, options).emit();
}
