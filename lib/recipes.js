var Recipes = {
  TYPES: {
    binary:     require('./recipes/binary'),
    javascript: require('./recipes/javascript')
  },

  get: function(type) {
    var module = this.TYPES[type];
    if (!module) throw new Error('Unknown package type "' + type + '"');
    return module;
  }
};

module.exports = Recipes;

