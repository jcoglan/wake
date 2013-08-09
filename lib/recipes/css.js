var fs      = require('fs'),
    path    = require('path'),
    exists  = fs.existsSync || path.existsSync,
    csso    = require('csso'),
    digest  = require('../util/digest'),
    permute = require('../util/permute');

var EXTENSIONS = permute(['', '.css', '.ejs']),
    IMPORT     = /@import\s+(?:url\s*\((.*?)\)|(.*?))\s*;\s*/g;

var CSS = {
  defaultBuild: function() {
    return {min: {minify: true, sourceMap: true, tag: 'suffix'}};
  },

  defaultExtension: function() {
    return '.css';
  },

  extensions: function() {
    return EXTENSIONS;
  },

  generate: function(wake, pathname, sources, settings) {
    var self = this;
    sources = sources.map(function(s) { return this.expand(wake, s, settings) }, this);

    wake.target(pathname, sources, function(deps) {
      var css     = self.concat(deps, settings),
          imports = [];

      css = css.replace(IMPORT, function(match) {
        imports.push(match.trim());
        return '';
      });

      css = imports.concat(css).join('\n');
      if (settings.minify) css = csso.justDoIt(css);

      return {
        data:   new Buffer(css, 'utf8'),
        digest: settings.digest && digest.hash(css)
      };
    });
  },

  concat: function(sources, settings) {
    return sources.map(function(s) { return s.data.replace(/\s*$/, '') })
                  .join(settings.separator || '\n\n');
  },

  expand: function(wake, source, settings, paths) {
    if (source._cssExpansion) return source._cssExpansion;
    paths = paths || [];

    var index = paths.indexOf(source.path), trace;
    if (index >= 0) {
      trace = paths.slice(index).concat(source.path).map(function(p) { return path.relative(wake._dir, p) });
      throw new Error('Circular dependency: ' + trace.join(' -> '));
    }

    if (!exists(source.path))
      throw new Error('File "' + source.path + '" does not exist');

    var css     = fs.readFileSync(source.path, 'utf8').replace(/\s*$/, ''),
        imports = [],
        self    = this;

    css = css.replace(IMPORT, function(match, url, string) {
      url = url || string;
      url = url.replace(/^['" ]*/, '').replace(/['" ]*$/, '');

      if (/^([a-z]+:)?\/\//i.test(url)) return match;

      url = /^\//.test(url)
          ? path.resolve(settings.root, url.substr(1))
          : path.resolve(path.dirname(source.path), url);

      imports.push(url);
      return '';
    });

    imports = imports.map(function(dep) {
      return this.expand(wake, wake.target(dep), settings, paths.concat(source.path));
    }, this);

    var proxy = wake.target(null, [source], function() {
      return {data: css};
    });
    
    return source._cssExpansion = wake.target(null, imports.concat(proxy), function(deps) {
      return {data: self.concat(deps, settings)};
    });
  }
};

module.exports = CSS;

