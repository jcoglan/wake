var Clean = require('clean-css');

module.exports = {
  minify: function(css) {
    if (typeof Clean.process === 'function')
      return Clean.process(css);
    else
      return new Clean().minify(css);
  }
};

