var uglify  = require('../processors/uglify'),
    permute = require('../util/permute'),
    ejs     = require('ejs');

var EXTENSIONS = permute(['', '.js', '.ejs']);

var JavaScript = {
  defaultBuild: function() {
    return {min: {minify: true, sourceMap: true, tag: 'suffix'}};
  },

  defaultExtension: function() {
    return '.js';
  },

  extensions: function() {
    return EXTENSIONS;
  },

  generate: function(wake, pathname, sources, settings) {
    var proxy = wake.target(null, sources, function(deps) {
      deps = deps.map(function(dep) {
        var data = dep.data.toString('utf8').replace(/\s*$/, '');

        if (/\.ejs$/i.test(dep.path))
          data = ejs.render(data, {locals: {wake: wake}});

        return {data: data, path: dep.path};
      });
      return {data: uglify.bundle(pathname, deps, settings)};
    });

    var js = wake.target(pathname, [proxy], function(deps) {
      return {data: new Buffer(deps[0].data.code, 'utf8')};
    });

    proxy.mtime = js.mtime;

    if (!settings.sourceMap) return;

    wake.target(pathname + '.map', [proxy], function(deps) {
      return {data: new Buffer(deps[0].data.map, 'utf8')};
    });
  }
};

module.exports = JavaScript;

