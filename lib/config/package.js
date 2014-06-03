var path   = require('path'),
    clone  = require('../util/clone'),
    merge  = require('../util/merge');

var Package = function(group, name, config) {
  this._group = group;
  this._name  = name;

  if (config === '')              config = name;
  if (typeof config === 'string') config = [config];
  if (config instanceof Array)    config = {files: config};

  this._config    = clone(config, {except: ['builds', 'extend', 'files']});
  this._parent    = config.extend && group.getPackage(config.extend);
  this._builds    = config.builds || {};
  this._targets   = {};
  this._directory = config.directory || '';
  this._files     = config.files;
};

Package.prototype.generateTargets = function() {
  var sources = this.getSources(),
      builds  = this.getBuilds();

  for (var key in builds) {
    this._targets[key] = this._group.generateTarget(this._name, key, sources, builds[key]);
  }
};

Package.prototype.getTarget = function(build) {
  var target = this._targets[build];
  if (!target) throw new Error('Unknown build name "' + build + '" for package "' + this._name + '" in group "' + this._group._name + '"');
  return target.path;
};

Package.prototype.getBuilds = function() {
  return this.__builds = this.__builds ||
                         merge(this._group._builds, this._builds, this._group.defaultBuild());
};

Package.prototype.getSources = function() {
  if (this._sources) return this._sources;

  var parent = this._parent,
      dir    = this._directory || (parent || {})._directory || '',
      files  = this._files;

  if (typeof files === 'string') files = files;

  var sources = files.map(function(file) {
    return this._group.resolvePath(dir, file);
  }, this);

  if (parent) sources = parent.getSources().concat(sources);
  return this._sources = sources;
};

module.exports = Package;
