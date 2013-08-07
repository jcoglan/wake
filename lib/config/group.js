var fs      = require('fs'),
    path    = require('path'),
    exists  = fs.existsSync || path.existsSync,
    clone   = require('../util/clone'),
    recipes = require('../recipes'),
    Package = require('./package');

var Group = function(wake, name, config) {
  this._wake = wake;
  this._name = name;
  this._type = name; // hack until we do types properly
  this._pkgs = {};

  this._config  = clone(config, {except: ['builds', 'targets']});
  this._builds  = config.builds  || {};
  this._targets = config.targets;
};

Group.prototype.defaultBuild = function() {
  return recipes.get(this._type).defaultBuild();
};

Group.prototype.generateTargets = function() {
  for (var name in this._targets) this.getPackage(name).generateTargets();
};

Group.prototype.generateTarget = function(name, build, sources, settings) {
  var pathname = this.pathFor(name, build),
      settings = this.getPackage(name).getBuilds()[build],
      recipe   = recipes.get(this._type);

  if (typeof settings.sourceMap === 'string')
    sources = this._wake.target(this.pathFor(name, settings.sourceMap));
  else
    sources = sources.map(this._wake.target, this._wake);

  recipe.generate(this._wake, pathname, sources, settings);
};

Group.prototype.getPackage = function(name) {
  if (this._pkgs[name]) return this._pkgs[name];
  var config = this._targets[name];
  if (!config) throw new Error('No package named "' + name + '" in group "' + this._name + '"');
  return this._pkgs[name] = new Package(this, name, config);
};

Group.prototype.pathFor = function(name, build) {
  var targetDir = this._config.targetDirectory,
      recipe    = recipes.get(this._type),
      settings  = this.getPackage(name).getBuilds()[build],
      extension = recipe.defaultExtension(),
      dirname   = path.dirname(name),
      basename  = path.basename(name, extension),
      pathname;

  if (!targetDir)
    throw new Error('No targetDirectory specified for group "' + this._name + '"');

  if (settings.tag === 'prefix') basename = build + '-' + basename;
  if (settings.tag === 'suffix') basename = basename + '-' + build;

  pathname = (settings.tag === 'directory')
           ? path.resolve(targetDir, build, dirname, basename)
           : path.resolve(targetDir, dirname, basename);

  pathname += extension;
  return pathname;
};

Group.prototype.resolvePath = function(dir, file) {
  var sourceDir = this._config.sourceDirectory;
  if (!sourceDir) 
    throw new Error('No sourceDirectory specified for group "' + this._name + '"');

  var filename = path.resolve(this._wake._dir, sourceDir, dir, file),
      exts     = recipes.get(this._type).extensions(),
      ext      = exts.filter(function(e) { return exists(filename + e) })[0];

  return filename + (ext || '');
};

module.exports = Group;

