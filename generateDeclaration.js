const typescript = require('typescript');
const { statSync } = require('fs');
const { join } = require('path');

module.exports = function(neutrino, declarationMap) {
  const tsconfig = neutrino.outputHandlers.get('tsconfig')(neutrino);
  const rawOptions = typescript.convertCompilerOptionsFromJson(tsconfig.compilerOptions).options;
  const sources = Object.values(neutrino.options.mains)
    .map((entry) => {
      if (typeof entry === 'object') {
        return entry.entry;
      }
      return entry;
    })
    .map((source) => {
      try {
        const sourceStat = statSync(source);
        if (sourceStat.isDirectory()) {
          return join(source, 'index');
        }
      } catch (ignore) {
        // filenames without extensions are allowed
      }
      return source;
    });

  const options = {
    ...rawOptions,
    noEmit: false, // this might not be needed any more
    declaration: true,
    emitDeclarationOnly: true,
    declarationMap,
    declarationDir: neutrino.options.output,
  };

  typescript.createProgram(sources, options).emit();
}
