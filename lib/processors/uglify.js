var uglify = require('uglify-js'),
    path   = require('path'),
    digest = require('../util/digest');

var bundle = function(pathname, sources, options) {
  var code = '', codeHash = '',
      map  = '', mapHash  = '',
      ast  = null;

  if (options.sourceMap !== false) {
    ast = sources.reduce(function(toplevel, source) {
      return uglify.parse(source.data, {
        filename: path.relative(path.dirname(pathname), source.path),
        toplevel: toplevel
      });
    }, ast);
  } else {
    code     = concat(sources, options);
    codeHash = digest.hash(code);
    ast      = uglify.parse(code);
  }

  if (options.minify === false) return {code: code, codeHash: codeHash};

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
  if (options.sourceMap !== false)
    output.source_map = uglify.SourceMap({file: path.basename(pathname), root: ''});

  var stream = uglify.OutputStream(output);
  ast.print(stream);
  code = stream.toString();
  codeHash = digest.hash(code);

  if (options.sourceMap === false) return {code: code, codeHash: codeHash};

  map = output.source_map.toString();

  if (options.digest) {
    map = JSON.parse(map);
    map.file = path.basename(digest.hashify(pathname, codeHash));
    map = JSON.stringify(map);
  }
  mapHash = digest.hash(map);

  var mapPath = options.digest
              ? path.basename(digest.hashify(pathname + '.map', mapHash))
              : path.basename(pathname + '.map');

  return {
    code:     code,
    codeHash: codeHash,
    map:      map,
    mapHash:  mapHash,
    mapPath:  mapPath
  };
};

var concat = function(sources, options) {
  var sep = options.separator || '\n\n';
  return sources.map(function(s) { return s.data }).join(sep);
};

module.exports = {
  bundle: bundle
};

