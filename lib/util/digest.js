var crypto  = require('crypto'),
    fs      = require('fs'),
    path    = require('path'),
    exists  = fs.existsSync || path.existsSync,
    mkdirp  = require('mkdirp'),
    Promise = require('./promise');

var MANIFEST = '.manifest.json';

var Digest = {
  hash: function(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
  },
  
  hashify: function(pathname, digest) {
    var dirname  = path.dirname(pathname),
        basename = path.basename(pathname),
        parts    = basename.split('.'),
        hashed   = [parts[0] + '-' + digest].concat(parts.slice(1)).join('.');

    Manifest.dir(dirname).set(basename, hashed);

    return path.resolve(dirname, hashed);
  },

  unhashify: function(pathname) {
    var dirname  = path.dirname(pathname),
        basename = path.basename(pathname);

    basename = Manifest.dir(dirname).get(basename) || basename;

    return path.resolve(dirname, basename);
  }
};

var Manifest = function(directory) {
  this._pathname  = path.resolve(directory, Manifest.FILENAME);
  this._directory = directory;

  if (exists(this._pathname))
    this._mappings = JSON.parse(fs.readFileSync(this._pathname, 'utf8'));
  else
    this._mappings = {};
};

Manifest.FILENAME = '.manifest.json';

Manifest.dir = function(directory) {
  this._dirs = this._dirs || {};
  return this._dirs[directory] = this._dirs[directory] || new Manifest(directory);
};

Manifest.prototype.get = function(file) {
  return this._mappings[file];
};

Manifest.prototype.set = function(file, hashed) {
  this._mappings[file] = hashed;

  var mappings = this._mappings,
      pathname = this._pathname;

  this._mkdir().then(function() {
    fs.writeFileSync(pathname, JSON.stringify(mappings, true, 2), 'utf8');
  });
};

Manifest.prototype._mkdir = function() {
  var dir = this._directory;
  return this._promise = this._promise || new Promise(function(fulfill, reject) {
    mkdirp(dir, function(error) {
      if (error) reject();
      else fulfill();
    });
  });
};

module.exports = Digest;

