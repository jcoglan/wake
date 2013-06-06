var fs       = require('fs'),
    path     = require('path'),
    exists   = fs.existsSync || path.existsSync,
    ejs      = require('ejs'),
    minifier = require('./minifier');

var Package = function(group, name, config) {
  this._group   = group;
  this._type    = group._type;
  this._wake    = group._wake;
  this._name    = name;
  this._targets = {};

  if (config === '') config = name;
  if (typeof config === 'string') config = {files: [config]};
  this._config = config;
};

Package.EXTENSIONS = {
  javascript: '.js',
  binary:     ''
};

Package.prototype.generateTargets = function() {
  var deps = this.getSources().map(function(pth) {
    return this._wake.target(pth);
  }, this);

  this._group.forEachBuild(function(build) {
    var settings = this._group.getTargetSettings(this._name, build);
    this['_generate_' + this._type](deps, settings);
  }, this);
};

Package.prototype.getSources = function() {
  if (this._sources) return this._sources;

  var parent = this._config.extend && this._group.getPackage(this._config.extend),
      dir    = this._config.directory || (parent && parent._config.directory) || '',
      files  = this._config.files;

  if (typeof files === 'string') files = [files];

  var sources = files.map(function(file) {
    var pth = path.join(this._group.getSourceDir(), dir, file),

        ext = [Package.EXTENSIONS[this._type], '']
              .filter(function(e) { return exists(pth + e) })[0];

    if (ext === undefined)
      throw new Error('File "' + file + '" in package "' + this._name + '" does not exist');

    return pth + ext;
  }, this);

  if (parent) sources = parent.getSources().concat(sources);
  return this._sources = sources;
};

Package.prototype._generate_javascript = function(deps, settings) {
  var sourceMap = settings.options.sourceMap,
      wake      = this._wake,
      pth;

  if (sourceMap) {
    pth  = this._group.getTargetSettings(this._name, sourceMap).path;
    deps = [wake.target(pth)];
  }

  var target = this._wake.target(null, deps, function(deps) {
    var sources = deps.map(function(dep) {
      var source = {
        data: dep.data.toString('utf8').replace(/\s*$/, ''),
        path: dep.path
      };
      source.data = ejs.render(source.data, {locals: {wake: wake}});
      return source;
    });
    return {data: minifier.bundle(sources, settings)};
  });

  this._wake.target(settings.path, [target], function() {
    return {data: new Buffer(target.data.code, 'utf8')};
  });

  if (!sourceMap) return;

  this._wake.target(settings.path + '.map', [target], function() {
    return {data: new Buffer(target.data.map, 'utf8')};
  });
};

Package.prototype._generate_binary = function(deps, settings) {
  this._wake.target(settings.path, deps, function(deps) {
    return deps[0];
  });
};

module.exports = Package;

