var Package = require('./package'),
    fs      = require('fs'),
    path    = require('path');

var Group = function(wake, type, config) {
  this._wake    = wake;
  this._type    = type;
  this._config  = config;
  this._layout  = config.layout || 'together';
  this._builds  = config.builds || {src: {suffix: false}};
  this._targets = {};
};

Group.prototype.getPackage = function(name) {
  var p = this._targets;
  return p[name] = p[name] || new Package(this, name, this._config.targets[name]);
};

Group.prototype.getSourceDir = function() {
  var dir = this._config.sourceDirectory;
  if (!dir) throw new Error('No sourceDirectory specified');
  return path.join(this._wake._dir, dir);
};

Group.prototype.getTargetSettings = function(name, build) {
  var settings = this._builds[build];
  if (!settings) throw new Error('Unknown build "' + build + '"');

  if (settings.path) return settings;

  var dir = this._config.targetDirectory;
  if (!dir) throw new Error('No targetDirectory specified');

  var layout   = this._layout,
      pth      = null;

  if (layout === 'apart') {
    pth = path.join(this._wake._dir, dir, build, name);
  } else if (layout === 'together') {
    pth = path.join(this._wake._dir, dir, name);
    if (settings.suffix !== false) pth += '-' + build;
  } else {
    throw new Error('Unrecognized layout type "' + layout + '"');
  }

  var ext = Package.EXTENSIONS[this._type];
  if (path.extname(pth) !== ext) pth += ext;

  return {
    path:     pth,
    settings: settings
  };
};

Group.prototype.run = function() {
  var name, pkg, build, target;
  for (name in this._config.targets) {
    pkg = this.getPackage(name);
    for (build in this._builds) pkg.update(build);
  }
};

module.exports = Group;

