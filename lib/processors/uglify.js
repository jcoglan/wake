var uglify = require('uglify-js'),
    path   = require('path');

var bundle = function(sources, settings) {
  var options = settings.options,
      code     = '',
      map      = '',
      ast      = null;

  if (options.sourceMap && options.minify !== false) {
    ast = sources.reduce(function(toplevel, source) {
      return uglify.parse(source.data, {
        filename: path.relative(path.dirname(settings.path), source.path),
        toplevel: toplevel
      });
    }, ast);
  } else {
    code = concat(sources, settings);
    ast  = uglify.parse(code);
  }

  if (options.minify === false) return {code: code, map: map};

  var compressor = uglify.Compressor({
    unsafe:   !options.safe,
    warnings: false
  });
  ast.figure_out_scope();
  ast = ast.transform(compressor);

  ast.figure_out_scope();
  ast.compute_char_frequency();
  ast.mangle_names({});

  var output = {
    comments: /@preserve|@license|@cc_on/i
  };
  if (options.sourceMap)
    output.source_map = uglify.SourceMap({file: path.basename(settings.path), root: ''});

  var stream = uglify.OutputStream(output);
  ast.print(stream);
  code = stream.toString();

  if (options.sourceMap) {
    code += '\n//@ sourceMappingURL=' + path.basename(settings.path) + '.map';
    map   = output.source_map.toString();
  }

  return {code: code, map: map};
};

var concat = function(sources, settings) {
  var sep = settings.options.separator || '\n\n';
  return sources.map(function(s) { return s.data }).join(sep);
};

module.exports = {
  bundle: bundle
};

