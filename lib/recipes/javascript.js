var uglify = require('../processors/uglify'),
    ejs    = require('ejs');

var JavaScript = {
  defaultBuild: function() {
    return {min: {minify: true, sourceMap: true, tag: 'suffix'}};
  },

  defaultExtension: function() {
    return '.js';
  },

  generate: function(wake, pathname, sources, settings) {
    var sourceMap = settings.sourceMapPath;
    if (sourceMap) sources = [wake.target(sourceMap)];

    var bridge = wake.target(null, sources, function(deps) {
      deps = deps.map(function(dep) {
        var data = dep.data.toString('utf8').replace(/\s*$/, '');
        data = ejs.render(data, {locals: {wake: wake}}); // TODO only do this for .ejs sources
        return {data: data, path: dep.path};
      });
      return {data: uglify.bundle(pathname, deps, settings)};
    });

    var js = wake.target(pathname, [bridge], function(deps) {
      return {data: new Buffer(deps[0].data.code, 'utf8')};
    });

    bridge.mtime = js.mtime;

    if (!sourceMap) return;

    wake.target(pathname + '.map', [bridge], function(deps) {
      return {data: new Buffer(deps[0].data.map, 'utf8')};
    });
  }
};

module.exports = JavaScript;

