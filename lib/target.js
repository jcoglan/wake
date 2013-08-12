var fs     = require('fs'),
    path   = require('path'),
    exists = fs.existsSync || path.existsSync,
    mkdirp = require('mkdirp'),
    digest = require('./util/digest');

var Target = function(wake, pathname) {
  this._wake       = wake;
  this.path        = pathname;
  this._upstream   = [];
  this._downstream = [];

  if (typeof pathname !== 'string') return;
  if (!exists(pathname)) return;

  var stat   = fs.statSync(pathname);
  this.mode  = stat.mode;
  this.mtime = stat.mtime.getTime();
};

Target.prototype.addDependency = function(target) {
  this._upstream.push(target);
  target.addDependent(this);
  if (typeof this.path !== 'string') this.mtime = this._maxmtime() - 1;
};

Target.prototype.addDependent = function(target) {
  this._downstream.push(target);
};

Target.prototype.targetClosestTo = function(pathname) {
  var downstream = this._downstream.filter(function(dep) {
    return typeof dep.path === 'string';
  }).map(function(dep) {
    return [path.relative(path.dirname(pathname), dep.path), dep];
  }).sort(function(a, b) {
    return a[0].split(path.sep).length - b[0].split(path.sep).length;
  });

  return (downstream.length > 0) ? downstream[0][1] : this;
};

Target.prototype.setFactory = function(factory) {
  if (typeof factory === 'function')
    this.factory = factory;
};

Target.prototype.unhashify = function() {
  return this.digestPath = this.digestPath || digest.unhashify(this.path)
};

Target.prototype.updateDowntream = function() {
  this._downstream.forEach(function(d) { d.update() });
};

Target.prototype.update = function() {
  if (this.data !== undefined) return;
  this._upstream.forEach(function(d) { d.update() });

  var changed = this._upstream.filter(function(t) { return !this.mtime || t.mtime > this.mtime }, this);

  if (changed.length === 0)
    return this.data = (typeof this.path === 'string')
                     ? fs.readFileSync(this.path)
                     : '';

  var output   = this.factory(this._upstream.slice()),
      pathname = this.path;

  this.data  = output.data;
  this.mtime = this._maxmtime();

  if (typeof this.path !== 'string') return;

  this._write(this.path, output.data, output.mode);

  if (!output.digest) return;

  this.digest     = output.digest;
  this.digestPath = digest.hashify(pathname, this.digest);

  this._write(this.digestPath, output.data, output.mode);
};

Target.prototype._maxmtime = function() {
  return Math.max.apply(Math, this._upstream.map(function(d) { return d.mtime }));
};

Target.prototype._write = function(pathname, data, mode) {
  this._wake.log('update', pathname);
  mkdirp(path.dirname(pathname), function() {
    fs.writeFileSync(pathname, data);
    if (mode) fs.chmodSync(pathname, mode);
  });
};

module.exports = Target;

