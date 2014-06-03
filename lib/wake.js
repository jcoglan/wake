var fs      = require('fs'),
    path    = require('path'),
    Group   = require('./config/group'),
    Helpers = require('./helpers'),
    Target  = require('./target');

var Wake = function(dir, env, config) {
  if (dir === undefined)
    throw new Error('Build started with no root directory');

  this._cache    = {};
  this._dir      = path.resolve(dir);
  this._env      = env;
  this._helpers  = new Helpers(this);
  this._groups   = {};
  this._targets  = {};
  this._targetId = 0;

  for (var type in config)
    this._groups[type] = new Group(this, type, config[type]);
};

Wake.prototype.cache = function() {
  this.generateTargets();
  var cache = JSON.stringify(this._cache, true, 2);
  fs.writeFileSync(path.resolve(this._dir, '.wake.json'), cache, 'utf8');
};

Wake.prototype.getAssetHosts = function(name) {
  var hosts = this.getGroup('css')._hosts,
      env   = this._env || 'default',
      list  = (hosts[env] || {})[name];

  if (!list) throw new Error('No host set named "' + name + '" for environment "' + env + '"');

  return list;
};

Wake.prototype.getGroup = function(type) {
  var group = this._groups[type];
  if (!group) throw new Error('No group named "' + type + '" in configuration');
  return group;
};

Wake.prototype.generateTargets = function() {
  for (var type in this._groups)
    this._groups[type].generateTargets();
};

Wake.prototype.log = function(event, pathname) {
  console.log('[' + event.toUpperCase() + '] ' + path.relative(this._dir, pathname));
};

Wake.prototype.storeSources = function(group, name, sources) {
  var c = this._cache;
  c = c[group] = c[group] || {};
  c = c[name]  = c[name]  || {};
  c.sources    = sources.map(function(s) { return path.relative(this._dir, s) }, this);
};

Wake.prototype.storeTarget = function(group, name, build, target) {
  var c = this._cache;

  c = c[group]  = c[group]  || {};
  c = c[name]   = c[name]   || {};
  c = c.targets = c.targets || {};
  c[build]      = path.relative(this._dir, target);
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

Wake.prototype.updateTargets = function() {
  for (var target in this._targets)
    this._targets[target].update();
};

Wake.build = function(dir, env, config) {
  return new Wake(dir, env, config);
};

module.exports = Wake;
