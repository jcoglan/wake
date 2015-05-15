var Clean = require('clean-css');

module.exports = {
  minify: function(css) {
    if (typeof Clean.process === 'function') {
      return Clean.process(css);
    } else {
      var minified = new Clean().minify(css);
      if (typeof minified === 'string')
        return minified;
      else // clean-css 3+
        return minified.styles;
  }
};
