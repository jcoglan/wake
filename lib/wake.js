var fs     = require('fs'),
    path   = require('path'),
    Group  = require('./group'),
    Target = require('./target');

var Wake = function(dir, config) {
  this._dir      = dir;
  this._groups   = {};
  this._targets  = {};
  this._targetId = 0;

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
    this._groups[type].generateTargets();

  for (var target in this._targets)
    this._targets[target].update();
};

Wake.prototype.target = function(pth, deps, factory) {
  if (pth)
    pth = path.resolve(this._dir, pth);
  else
    pth = ++this._targetId;

  var target = this._targets[pth] = this._targets[pth] || new Target(this, pth);

  if (typeof deps === 'function') {
    factory = deps;
    deps    = [];
  }
  if (typeof deps === 'string') deps = this.target(deps);
  if (deps === undefined)       deps = [];
  if (!(deps instanceof Array)) deps = [deps];

  deps.forEach(target.addDependency, target);
  target.setFactory(factory);

  return target;
};

exports.build = function(dir, config) {
  return new Wake(dir, config);
};

