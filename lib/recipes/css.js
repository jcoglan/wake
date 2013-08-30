var fs         = require('fs'),
    path       = require('path'),
    exists     = fs.existsSync || path.existsSync,
    mime       = require('mime'),
    digest     = require('../util/digest'),
    permute    = require('../util/permute'),
    processors = require('../processors');

var EXTENSIONS = permute(['', '.css', '.ejs']),
    ABSOLUTE   = /^\//,
    IMPORT     = /@import\s+(?:url\s*\((.*?)\)|(.*?))\s*;\s*/g,
    PROTOCOL   = /^([a-z]+:)?\/\//i,
    URL        = /\b(url\s*\(\s*['"]?)(.*?)(['"]?\s*\))/,
    URL_G      = new RegExp(URL.source, 'g');

var CSS = {
  defaultBuild: function() {
    return {min: {minify: true, sourceMap: true, tag: false, digest: true}};
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

    return wake.target(pathname, sources, function(deps) {
      deps = self.reduce(deps).map(function(dep) {
        return self.rewritePaths(wake, dep, pathname, settings);
      });

      var css       = self.concat(deps, settings),
          processor = settings.safe ? processors.get('clean') : processors.get('csso'),
          imports   = [];

      css = css.replace(IMPORT, function(match) {
        imports.push(match.trim());
        return '';
      });

      css = imports.concat(css).join('\n');
      if (settings.minify !== false) css = processor.minify(css);

      return {
        data:   new Buffer(css, 'utf8'),
        digest: settings.digest !== false && digest.hash(css)
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
      url = self.resolve(url, source.path, settings.sourceRoot);
      if (!url) return match;
      imports.push(url);
      return '';
    });

    (css.match(URL_G) || []).forEach(function(url) {
      url = url.match(URL);
      var pathname = self.resolve(url[2], source.path, settings.sourceRoot);
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

  rewritePaths: function(wake, source, pathname, settings) {
    source.urls.forEach(function(u) { u.updateDowntream() });
    var self = this;

    var css = source.data.replace(URL_G, function(match) {
      var url = match.match(URL),
          pth = self.resolve(url[2], source.path, settings.sourceRoot),
          target, targetPath, hosts, host;

      if (!pth) return match;

      target = wake.target(pth).targetClosestTo(pathname);
      targetPath = target.unhashify();

      if (settings.inline) {
        pth = 'data:' + mime.lookup(targetPath) + ';base64,' + target.data.toString('base64');
      } else if (settings.hosts) {
        if (!settings.targetRoot) throw new Error('No targetRoot specified to create absolute URL for "' + pth + '" referenced by "' + source.path + '"');
        hosts = wake.getAssetHosts(settings.hosts);
        host  = hosts[parseInt(digest.hash(targetPath).substr(0,8), 16) % hosts.length];
        pth   = host.replace(/\/*$/, '/') + path.relative(settings.targetRoot, targetPath);
      } else {
        pth = path.relative(path.dirname(pathname), targetPath);
      }
      return url[1] + pth + url[3];
    });
    return {data: css};
  },

  resolve: function(url, pathname, root) {
    if (PROTOCOL.test(url)) return null;

    if (ABSOLUTE.test(url)) {
      if (!root) throw new Error('No sourceRoot specified to resolve URL "' + url + '" in file "' + pathname + '"');
      return path.resolve(root, url.substr(1));
    } else {
      return path.resolve(path.dirname(pathname), url);
    }
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

