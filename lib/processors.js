var processors = {
  csso:   require('./processors/csso'),
  clean:  require('./processors/clean'),
  uglify: require('./processors/uglify')
};

module.exports = {
  get: function(name) {
    var processor = processors[name];
    if (!processor) throw new Error('No such processor "' + name + '"');
    return processor;
  }
};
