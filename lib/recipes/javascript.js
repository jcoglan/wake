var path    = require('path'),
    ejs     = require('ejs'),
    uglify  = require('../processors/uglify'),
    digest  = require('../util/digest'),
    permute = require('../util/permute');

var EXTENSIONS = permute(['', '.js', '.ejs']);

var JavaScript = {
  defaultBuild: function() {
    return {min: {minify: true, sourceMap: true, tag: false, digest: true}};
  },

  defaultExtension: function() {
    return '.js';
  },

  extensions: function() {
    return EXTENSIONS;
  },

  generate: function(wake, pathname, sources, settings) {
    if (settings.minify === false) settings.sourceMap = false;

    var proxy = wake.target(null, sources, function(deps) {
      deps = deps.map(function(dep) {
        var data = dep.data.toString('utf8').replace(/\s*$/, '');

        if (/\.ejs$/i.test(dep.path))
          data = ejs.render(data, {locals: {wake: wake}});

        return {data: data, path: dep.unhashify()};
      });
      return {data: uglify.bundle(pathname, deps, settings)};
    });

    var js = wake.target(pathname, [proxy], function(deps) {
      var data = deps[0].data,
          code = data.code;

      if (settings.sourceMap !== false)
        code += '\n//@ sourceMappingURL=' + data.mapPath;

      return {
        data:   new Buffer(code, 'utf8'),
        digest: settings.digest && data.codeHash
      };
    });

    proxy.mtime = js.mtime;

    if (settings.sourceMap !== false)
      wake.target(pathname + '.map', [proxy], function(deps) {
        var data = deps[0].data;
        return {
          data:   new Buffer(data.map, 'utf8'),
          digest: settings.digest && data.mapHash
        };
      });

    return js;
  }
};

module.exports = JavaScript;

