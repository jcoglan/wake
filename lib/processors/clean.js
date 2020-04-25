var Clean = require('clean-css');

module.exports = {
  minify: function(css) {
    if (typeof Clean.process === 'function') { // clean-css 1.x
      return Clean.process(css);
    } else {
      var minified = new Clean().minify(css);
      if (typeof minified === 'string') // clean-css 2.x
        return minified;
      else // clean-css 3+
        return minified.styles;
    }
  }
};
