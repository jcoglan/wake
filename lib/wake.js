var path    = require('path'),
    Group   = require('./config/group'),
    Helpers = require('./helpers'),
    Target  = require('./target');

var Wake = function(dir, config) {
  if (dir === undefined)
    throw new Error('Build started with no root directory');

  this._dir      = path.resolve(dir);
  this._helpers  = new Helpers(this);
  this._groups   = {};
  this._targets  = {};
  this._targetId = 0;

  for (var type in config)
    this._groups[type] = new Group(this, type, config[type]);
};

Wake.prototype.log = function(event, pathname) {
  console.log('[' + event.toUpperCase() + '] ' + path.relative(this._dir, pathname));
};

Wake.prototype.run = function() {
  this.generateTargets();
  this.updateTargets();
};

Wake.prototype.generateTargets = function() {
  for (var type in this._groups)
    this._groups[type].generateTargets();
};

Wake.prototype.updateTargets = function() {
  for (var target in this._targets)
    this._targets[target].update();
};

Wake.prototype.target = function(pathname, deps, factory) {
  if (pathname instanceof Target) return pathname;

  if (typeof pathname === 'string')
    pathname = path.resolve(this._dir, pathname);
  else
    pathname = ++this._targetId;

  var target = this._targets[pathname] = this._targets[pathname] || new Target(this, pathname);

  if (typeof deps === 'function') {
    factory = deps;
    deps    = [];
  }
  deps = (deps === undefined) ? [] : [].concat(deps);
  deps = deps.map(function(d) { return this.target(d) }, this);

  deps.forEach(target.addDependency, target);
  target.setFactory(factory);

  return target;
};

Wake.build = function(dir, config) {
  return new Wake(dir, config);
};

module.exports = Wake;

