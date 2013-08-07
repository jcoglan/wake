var fs     = require('fs'),
    path   = require('path'),
    exists = fs.existsSync || path.existsSync,
    mkdirp = require('mkdirp');

var Target = function(wake, pathname) {
  this._wake = wake;
  this.path  = pathname;
  this._deps = [];

  if (typeof pathname !== 'string') return;
  if (!exists(pathname)) return;

  var stat   = fs.statSync(pathname);
  this.mode  = stat.mode;
  this.mtime = stat.mtime.getTime();
};

Target.prototype.addDependency = function(target) {
  this._deps.push(target);
};

Target.prototype.setFactory = function(factory) {
  if (typeof factory === 'function')
    this.factory = factory;
};

Target.prototype.update = function() {
  if (this.data !== undefined) return;
  this._deps.forEach(function(d) { d.update() });

  var changed = this._deps.filter(function(t) { return !this.mtime || t.mtime > this.mtime }, this);

  if (changed.length === 0)
    return this.data = (typeof this.path === 'string')
                     ? fs.readFileSync(this.path)
                     : '';

  var output   = this.factory(this._deps),
      pathname = this.path;

  this.data  = output.data;
  this.mtime = new Date().getTime();

  if (typeof pathname === 'number') return;

  this._wake.log('update', pathname);

  mkdirp(path.dirname(this.path), function() {
    fs.writeFileSync(pathname, output.data);
    if (output.mode) fs.chmodSync(pathname, output.mode);
  });
};

module.exports = Target;

