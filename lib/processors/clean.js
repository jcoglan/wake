var clean = require('clean-css');

module.exports = {
  minify: function(css) {
    return clean.process(css);
  }
};

