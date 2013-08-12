var fs      = require('fs'),
    path    = require('path'),
    exists  = fs.existsSync || path.existsSync,
    csso    = require('csso'),
    digest  = require('../util/digest'),
    permute = require('../util/permute');

var EXTENSIONS = permute(['', '.css', '.ejs']),
    IMPORT     = /@import\s+(?:url\s*\((.*?)\)|(.*?))\s*;\s*/g,
    URL        = /\b(url\s*\(\s*['"]?)(.*?)(['"]?\s*\))/,
    URL_G      = new RegExp(URL.source, 'g');

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
      deps = self.reduce(deps).map(function(dep) {
        dep.urls.forEach(function(u) { u.updateDowntream() });

        var css = dep.data.replace(URL_G, function(match) {
          var url = match.match(URL),
              pth = self.resolve(url[2], dep.path, settings.root);

          if (!pth) return match;

          pth = path.relative(path.dirname(pathname), wake.target(pth).unhashify());
          return url[1] + pth + url[3];
        });
        return {data: css};
      });

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

  expand: function(wake, source, settings, paths) {
    if (source._cssExpansion) return source._cssExpansion;
    paths = paths || [];

    var index = paths.indexOf(source.path), trace;
    if (index >= 0) {
      trace = paths.slice(index).concat(source.path).map(function(p) { return path.relative(wake._dir, p) });
      throw new Error('Circular dependency: ' + trace.join(' -> '));
    }

    if (!exists(source.path))
      throw new Error('File "' + path.relative(wake._dir, source.path) +
                      '" referenced by "' + path.relative(wake._dir, paths.pop()) +
                      '" does not exist');

    var css     = fs.readFileSync(source.path, 'utf8'),
        imports = [],
        urls    = [],
        self    = this;

    css = css.replace(IMPORT, function(match, url, string) {
      url = url || string;
      url = url.replace(/^\s*['"]?/, '').replace(/['"]?\s*$/, '');
      url = self.resolve(url, source.path, settings.root);
      if (!url) return match;
      imports.push(url);
      return '';
    });

    (css.match(URL_G) || []).forEach(function(url) {
      url = url.match(URL);
      var pathname = self.resolve(url[2], source.path, settings.root);
      if (pathname) urls.push(pathname);
    });

    imports = imports.map(function(dep) {
      return this.expand(wake, wake.target(dep), settings, paths.concat(source.path));
    }, this);

    var proxy = wake.target(null, urls.concat(source), function(deps) {
      var last = deps.pop();
      return {
        data: [{data: css, path: last.path, urls: deps}]
      };
    });
    
    return source._cssExpansion = wake.target(null, imports.concat(proxy), function(deps) {
      return {data: self.reduce(deps)};
    });
  },

  resolve: function(url, pathname, root) {
    if (/^([a-z]+:)?\/\//i.test(url)) return null;

    return /^\//.test(url)
           ? path.resolve(root, url.substr(1))
           : path.resolve(path.dirname(pathname), url);
  },

  concat: function(sources, settings) {
    return sources.map(function(s) { return s.data.replace(/\s*$/, '') })
                  .join(settings.separator || '\n\n');
  },

  reduce: function(sources) {
    return sources.map(function(s) { return s.data })
                  .reduce(function(a, b) { return a.concat(b) });
  }
};

module.exports = CSS;

