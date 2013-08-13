var digest = require('../util/digest');

var Binary = {
  defaultBuild: function() {
    return {src: {tag: false, digest: true}};
  },

  defaultExtension: function() {
    return '';
  },

  extensions: function() {
    return [''];
  },

  generate: function(wake, pathname, sources, settings) {
    wake.target(pathname, sources, function(deps) {
      var size   = deps.reduce(function(s, d) { return s + d.data.length }, 0),
          buffer = new Buffer(size),
          offset = 0;

      deps.forEach(function(dep) {
        dep.data.copy(buffer, offset);
        offset += dep.data.length;
      });

      return {
        data:   buffer,
        digest: settings.digest && digest.hash(buffer)
      };
    });
  }
};

module.exports = Binary;

