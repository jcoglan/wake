var digest = require('../util/digest');

var Binary = {
  defaultBuild: function() {
    return {min: {tag: false, digest: true}};
  },

  defaultExtension: function() {
    return '';
  },

  extensions: function() {
    return [''];
  },

  generate: function(wake, pathname, sources, settings) {
    return wake.target(pathname, sources, function(deps) {
      var size   = deps.reduce(function(s, d) { return s + d.data.length }, 0),
          buffer = new Buffer(size),
          offset = 0;

      deps.forEach(function(dep) {
        dep.data.copy(buffer, offset);
        offset += dep.data.length;
      });

      var mode = Math.max.apply(Math, deps.map(function(d) { return d.mode || 0 }));

      return {
        data:   buffer,
        digest: settings.digest !== false && digest.hash(buffer),
        mode:   mode
      };
    });
  }
};

module.exports = Binary;

