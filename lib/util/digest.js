var crypto = require('crypto'),
    fs     = require('fs'),
    path   = require('path'),
    exists = fs.existsSync || path.existsSync,
    mkdirp = require('mkdirp');

var MANIFEST = '.manifest.json';

var Digest = {
  hash: function(buffer) {
    return crypto.createHash('sha1').update(buffer).digest('hex');
  },
  
  hashify: function(pathname, digest) {
    var dirname  = path.dirname(pathname),
        basename = path.basename(pathname),
        parts    = basename.split('.'),
        hashed   = [parts[0] + '-' + digest].concat(parts.slice(1)).join('.'),
        manPath  = path.resolve(dirname, MANIFEST);

    mkdirp(dirname, function() {
      var manifest = exists(manPath)
                   ? JSON.parse(fs.readFileSync(manPath, 'utf8'))
                   : {};

      manifest[basename] = hashed;
      fs.writeFileSync(manPath, JSON.stringify(manifest, true, 2), 'utf8');
    });

    return path.resolve(dirname, hashed);
  },

  unhashify: function(pathname) {
    var dirname  = path.dirname(pathname),
        basename = path.basename(pathname),
        manPath  = path.resolve(dirname, MANIFEST);

    if (!exists(manPath)) return pathname;

    var manifest = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    basename = manifest[basename] || basename;

    return path.resolve(dirname, basename);
  }
};

module.exports = Digest;

