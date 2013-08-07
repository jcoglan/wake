var Binary = {
  defaultBuild: function() {
    return {src: {tag: false}};
  },

  defaultExtension: function() {
    return '';
  },

  generate: function(wake, pathname, sources, settings) {
    wake.target(pathname, sources, function(deps) {
      return deps[0];
    });
  }
};

module.exports = Binary;

