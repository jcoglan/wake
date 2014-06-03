var fs = require('fs');

var Helpers = function(wake) {
  this._wake = wake;
};

Helpers.prototype.comment = function(string) {
  return '/**\n' +
         string.split('\n').map(function(line) { return ' * ' + line }).join('\n') +
         '\n **/';
};

Helpers.prototype.file = function(pathname) {
  return fs.readFileSync(path.join(this._wake._dir, pathname), 'utf8').replace(/\s*$/, '');
};

module.exports = Helpers;
