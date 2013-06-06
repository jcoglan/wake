var fs     = require('fs'),
    path   = require('path'),
    exists = fs.existsSync || path.existsSync,
    mkdirp = require('mkdirp');

var Target = function(wake, pth) {
  this._wake = wake;
  this.path  = pth;
  this._deps = [];

  if (typeof pth !== 'string') return;
  if (!exists(pth)) return;

  var stat   = fs.statSync(pth);
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

  var output = this.factory(this._deps),
      pth    = this.path;

  this.data  = output.data;
  this.mtime = new Date().getTime();

  if (typeof pth === 'number') return;

  console.log(' [UPDATE] ' + path.relative(this._wake._dir, pth));

  mkdirp(path.dirname(this.path), function() {
    fs.writeFileSync(pth, output.data);
    if (output.mode) fs.chmodSync(pth, output.mode);
  });
};

module.exports = Target;

