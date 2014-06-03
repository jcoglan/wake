var fs      = require('fs'),
    path    = require('path'),
    exists  = fs.existsSync || path.existsSync,
    glob    = require('glob'),
    clone   = require('../util/clone'),
    recipes = require('../recipes'),
    Package = require('./package');

var Group = function(wake, name, config) {
  this._wake = wake;
  this._name = name;
  this._pkgs = {};

  this._config  = clone(config, {except: ['builds', 'hosts', 'targets']});
  this._hosts   = config.hosts || {};
  this._type    = this._config.type || this._name;
  this._builds  = config.builds  || {};
  this._targets = config.targets;
};

Group.prototype.defaultBuild = function() {
  return recipes.get(this._type).defaultBuild();
};

Group.prototype.generateTargets = function() {
  var name, paths;
  for (name in this._targets) {
    paths = glob.sync(name, {cwd: this._config.sourceDirectory});
    if (paths.length === 0) paths = [name];
    paths.forEach(function(pathname) {
      this.getPackage(pathname, this._targets[name]).generateTargets();
    }, this);
  }
};

Group.prototype.generateTarget = function(name, build, sources, settings) {
  var pathname = this.pathFor(name, build),
      settings = this.getPackage(name).getBuilds()[build],
      recipe   = recipes.get(this._type);

  this._wake.storeSources(this._name, name, sources);

  if (typeof settings.sourceMap === 'string')
    sources = this._wake.target(this.pathFor(name, settings.sourceMap));
  else
    sources = sources.map(function(s) { return this._wake.target(s) }, this);

  settings.sourceRoot = path.resolve(this._wake._dir, settings.sourceRoot || this._config.sourceRoot || '');
  settings.targetRoot = path.resolve(this._wake._dir, settings.targetRoot || this._config.targetRoot || '');

  var target = recipe.generate(this._wake, pathname, sources, settings);
  this._wake.storeTarget(this._name, name, build, target.path);
  return target;
};

Group.prototype.getPackage = function(name, config) {
  if (this._pkgs[name]) return this._pkgs[name];
  if (arguments.length < 2) config = this._targets[name];

  if (config === undefined)
    throw new Error('No package named "' + name + '" in group "' + this._name + '"');

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
           ? path.resolve(this._wake._dir, targetDir, build, dirname, basename)
           : path.resolve(this._wake._dir, targetDir, dirname, basename);

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
