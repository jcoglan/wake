var fs = require('fs');

var Helpers = function(wake) {
  this._wake = wake;
};

Helpers.prototype.comment = function(string) {
  return '/**\n' +
         string.split('\n').map(function(line) { return ' * ' + line }).join('\n') +
         '\n **/';
};

Helpers.prototype.file = function(pth) {
  return fs.readFileSync(path.join(this._wake._dir, pth), 'utf8').replace(/\s*$/, '');
};

module.exports = Helpers;

