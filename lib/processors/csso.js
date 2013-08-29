var csso = require('csso');

module.exports = {
  minify: function(css) {
    return csso.justDoIt(css);
  }
};


