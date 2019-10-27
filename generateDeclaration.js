const path = require('path');
const typescript = require('typescript');

module.exports = function(neutrino, declarationMap) {
  const rawOptions = typescript.getDefaultCompilerOptions();
  Object.values(neutrino.options.mains).forEach((entry) => {

    if (typeof entry === 'object') {
      entry = entry.entry;
    }

    const outputName = `${path.parse(entry).name}.d.ts`;

    const options = {
      ...rawOptions,
      noEmit: false, // this might not be needed any more
      isolatedModules: false, // https://github.com/microsoft/TypeScript/issues/29490 (fixed in 3.6.4+)
      declaration: true,
      emitDeclarationOnly: true,
      declarationMap,
      declarationDir: neutrino.options.output, // not needed when using outFile
      outFile: path.join(neutrino.options.output, outputName),
    };

    typescript.createProgram([entry], options).emit();
  });
}
