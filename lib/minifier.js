var uglify = require('uglify-js'),
    path   = require('path');

var bundle = function(sources, target) {
  var settings = target.settings,
      code     = '',
      map      = '',
      ast      = null;

  if (settings.sourceMap && settings.minify !== false) {
    ast = sources.reduce(function(toplevel, source) {
      return uglify.parse(source.content, {
        filename: path.relative(path.dirname(target.path), source.path),
        toplevel: toplevel
      });
    }, ast);
  } else {
    code = concat(sources, target);
    ast  = uglify.parse(code);
  }

  if (settings.minify === false) return {content: code, map: map};

  var compressor = uglify.Compressor({
    unsafe:   !settings.safe,
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
  if (settings.sourceMap)
    output.source_map = uglify.SourceMap({file: path.basename(target.path), root: ''});

  var stream = uglify.OutputStream(output);
  ast.print(stream);
  code = stream.toString();

  if (settings.sourceMap) {
    code += '\n//@ sourceMappingURL=' + path.basename(target.path) + '.map';
    map   = output.source_map.toString();
  }

  return {content: code, map: map};
};

var concat = function(sources, target) {
  var sep = target.settings.separator || '\n\n';
  return sources.map(function(s) { return s.content }).join(sep);
};

module.exports = {
  bundle: bundle,
  concat: concat
};

