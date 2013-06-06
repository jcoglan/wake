var fs       = require('fs'),
    path     = require('path'),
    exists   = fs.existsSync || path.existsSync,
    ejs      = require('ejs'),
    mkdirp   = require('mkdirp'),
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

    var stat = fs.statSync(pth + ext);

    return {
      mode:  stat.mode,
      mtime: stat.mtime.getTime(),
      path:  pth + ext
    };
  }, this);

  if (parent) sources = parent.getSources().concat(sources);
  return this._sources = sources;
};

Package.prototype.getTarget = function(build) {
  if (this._targets[build]) return this._targets[build];

  var options = this._group.getTargetSettings(this._name, build),
      pth     = options.path;

  return this._targets[build] = {
    mtime:    exists(pth) ? fs.statSync(pth).mtime.getTime() : null,
    path:     pth,
    settings: options.settings
  };
};

Package.prototype.update = function(build) {
  var target    = this.getTarget(build),
      sourceMap = target.settings.sourceMap,
      sources   = this.getSources();

  if (typeof sourceMap === 'string') {
    this.update(sourceMap);
    sources = [this.getTarget(sourceMap)];
  }

  if (target.content !== undefined) return;
  var changed = sources.filter(function(s) { return !target.mtime || s.mtime > target.mtime });

  if (changed.length === 0 && !this._wake.forced) {
    //console.log('    [SKIP]            ' + path.relative(this._wake._dir, target.path));
    return target.content = fs.readFileSync(target.path);
  }

  sources.forEach(function(source) {
    if (source.content !== undefined) return;
    source.content = fs.readFileSync(source.path);
  }, this);

  var writes = this['_prepare_' + this._type](sources, target),
      wake   = this._wake;

  for (var pathname in writes) (function(pathname, write) {
    var size = write.content.length.toString();
    while (size.length < 8) size = ' ' + size;
    console.log('  [UPDATE]  ' + size + '  ' + path.relative(wake._dir, pathname));

    mkdirp(path.dirname(pathname), function() {
      fs.writeFileSync(pathname, write.content);
      if (write.mode) fs.chmodSync(pathname, write.mode);
    });
  })(pathname, writes[pathname]);
};

Package.prototype._prepare_javascript = function(sources, target) {
  sources.forEach(function(source) {
    source.content = ejs.render(source.content.toString('utf8'), {locals: {wake: this._wake}})
                     .replace(/\s*$/, '');
  }, this);

  var bundle = minifier.bundle(sources, target);

  target.content = new Buffer(bundle.content, 'utf8');
  target.map     = new Buffer(bundle.map, 'utf8');
  target.mtime   = new Date().getTime();

  var writes = {};
  writes[target.path] = {content: target.content};
  if (target.settings.sourceMap)
    writes[target.path + '.map'] = {content: target.map};

  return writes;
};

Package.prototype._prepare_binary = function(sources, target) {
  target.content = sources[0].content;
  target.mtime   = new Date().getTime();

  var writes = {};
  writes[target.path] = sources[0];
  return writes;
};

module.exports = Package;

