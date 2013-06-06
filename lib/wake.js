var fs    = require('fs'),
    path  = require('path'),
    Group = require('./group');

var Wake = function(dir, config) {
  this._dir    = dir;
  this._groups = {};

  for (var type in config)
    this._groups[type] = new Group(this, type, config[type]);
};

Wake.prototype.comment = function(string) {
  return '/**\n' +
         string.split('\n').map(function(line) { return ' * ' + line }).join('\n') +
         '\n **/';
};

Wake.prototype.file = function(pth) {
  return fs.readFileSync(path.join(this._dir, pth), 'utf8').replace(/\s*$/, '');
};

Wake.prototype.run = function() {
  for (var type in this._groups)
    this._groups[type].run();
};

exports.build = function(dir, config) {
  return new Wake(dir, config);
};

