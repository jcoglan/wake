# wake

`wake` (short for 'web make') is a build tool for website assets. It aims to fix
the problems caused by other asset toolchains that conflate several concerns
related to deploying static assets:

* Compiling languages like CoffeeScript and Sass to JavaScript and CSS
* Optimising JavaScript and CSS for fast download times in production
* Generating links from HTML to JavaScript, CSS and image files

`wake` *only* implements the second part: it optimises JavaScript, CSS and
binary files for production. It is configurable to allow for different use
cases; I have different concerns when working on an open-source library and when
working on an application, and `wake` supports both these use cases. Its default
settings are tailored to application deployment.

Because it only implements the optimisation phase, `wake` is not coupled to any
web framework. You can use it in any project, and it generates enough metadata
files that an application can easily find out which files it should generate
links to.

If you want to compile other languages to JS/CSS, or use a dependency resolver
like Browserify, that can be done as a separate step using Make (or one of its
clones), or by running tasks on file changes using Guard. After this compilation
step you can run `wake` on the resulting files to optimise them.

Here's a few of the things `wake` can do with your files:

* Concatenate and minify JavaScript and CSS files
* Generate optimised files with a content hash in the filename
* Generate source maps for JavaScript with correct relative path references
* Resolve and inline CSS files referenced by `@import` statements
* Rewrite CSS `url()` paths so the optimised CSS references the same files as
  the source code
* Inline files referenced by `url()` expressions as data URIs


## Installation

```
$ npm install -g wake
```


## Usage

`wake` is a command-line program; if you installed it globally then type `wake`
to run it, or if you installed it inside your project then run
`./node_modules/.bin/wake`.

`wake` is configured using data stored in your project's `package.json` file.
Its config has three sections: `javascript`, `css` and `binary`. Each section
has a `sourceDirectory`, which is the directory containing all the source files,
and a `targetDirectory`, which is where the optimised files are written to.

The `css` group also requires a `sourceRoot` setting, which tells `wake` where
to resolve absolute paths in `url()` expressions when it is inlining `@import`
statements and rewriting path references.

The only other required field is `targets`, which lists the name of each
optimised file and the names of the source files it should contain.

```js
// package.json

{
  "name":     "my-project",
  "version":  "0.0.0",

  "devDependencies": {
    "wake": ">=0.2.0"
  },

  "wake": {
    "javascript": {
      "sourceDirectory": "public/javascripts",
      "targetDirectory": "public/assets",
      "targets": {
        "scripts.js": ["foo.js", "bar.js"]
      }
    },
    "css": {
      "sourceDirectory": "public/stylesheets",
      "targetDirectory": "public/assets",
      "sourceRoot":      "public",
      "targets": {
        "styles.css": ["navigation.css", "footer.css"]
      }
    },
    "binary": {
      "sourceDirectory": "public/images",
      "targetDirectory": "public/assets",
      "targets": {
        "logo.png": "logo.png"
      }
    }
  }
}
```

This configuration takes the following project tree:

```
.
├── package.json
└── public
    ├── images
    │   └── logo.png
    ├── javascripts
    │   ├── bar.js
    │   └── foo.js
    └── stylesheets
        ├── footer.css
        └── navigation.css
```

and generates the following files when you run `wake`:

```
.
├── .wake.json
└── public
    └── assets
        ├── .manifest.json
        ├── logo.png
        ├── logo-2fa8d38.png
        ├── scripts.js
        ├── scripts-bb210c6.js
        ├── scripts.js.map
        ├── scripts-300b304.js.map
        ├── styles.css
        └── styles-5a2ceb1.css
```


### Generated files

Two copies of each target are generated: one with a content hash in the filename
and one without. The hashed names are for applications that can dynamically
detect which files to serve, and the hashes serve to make the files indefinitely
cacheable. The un-hashed names are for things that need predictable filenames,
like the static page outside your web stack that runs your JS tests.

The build generates two metadata files that give you information about the
generated assets, to make it easy to generate links to them from your
application.

`.wake.json` is generated in the root of the project and contains an index
telling you the absolute paths of the source files and target files for each
asset in your configuration. For our example, this looks like:

```js
{
  "javascript": {
    "scripts.js": {
      "sources": [
        "public/javascripts/foo.js",
        "public/javascripts/bar.js"
      ],
      "targets": {
        "min": "public/assets/scripts.js"
      }
    }
  },
  "css": {
    "styles.css": {
      "sources": [
        "public/stylesheets/navigation.css",
        "public/stylesheets/footer.css"
      ],
      "targets": {
        "min": "public/assets/styles.css"
      }
    }
  },
  "binary": {
    "logo.png": {
      "sources": [
        "public/images/logo.png"
      ],
      "targets": {
        "min": "public/assets/logo.png"
      }
    }
  }
}
```

The second metadata file is `.manifest.json`. This file is generated in each
directory that contains targets with content hashes in their filenames, and
contains a mapping from the canonical filename to the hashed one. This lets an
application find the hashed filename for each file it wants to link to.

```js
// public/assets/.manifest.json

{
  "scripts.js": "scripts-bb210c6.js",
  "scripts.js.map": "scripts-300b304.js.map",
  "styles.css": "styles-5a2ceb1.css",
  "logo.png": "logo-2fa8d38.png"
}
```


### Configuration short-hands

It can be cumbersome to list out every file in the project, especially for
binary files which just copy one file from one place to another. So, there are
two shorthands you can use to make things easier.

#### Blank targets

If you give the empty string in place of the source list for a target, `wake`
just inserts the name of the target file as the name of the source. So, these
are equivalent:

```js
      "targets": {                "targets": {
        "logo.png": ""              "logo.png": ["logo.png"]
      }                           }
```

#### Path globbing

Rather than list every file in the project, you can use a glob. For example,
this generates a target for every CSS file in `public/stylesheets` (but not its
subdirectories):

```js
    "css": {
      "sourceDirectory": "public/stylesheets",
      "targetDirectory": "public/assets",
      "targets": {
        "*.css": ""
      }
    }
```

And this generates a target for each file in `public/images` and all its
subdirectories:

```js
    "binary": {
      "sourceDirectory": "public/images",
      "targetDirectory": "public/assets",
      "targets": {
        "**/*.*": ""
      }
    }
```


### Customising the build

`wake` comes with default behaviour that is optimised for application
development, but it can be customised to provide additional information your app
might need, or to change how it builds files. Consider our original example
JavaScript configuration:

```js
    "javascript": {
      "sourceDirectory": "public/javascripts",
      "targetDirectory": "public/assets",
      "targets": {
        "scripts.js": ["foo.js", "bar.js"]
      }
    }
```

The source files are converted into the target files using a set of *build
settings*. You can specify multiple builds with different settings. For example,
this configuration generates a minified and unminified copy of the build with no
content hash, which is more suitable for library development:

```js
    "javascript": {
      "sourceDirectory": "public/javascripts",
      "targetDirectory": "public/assets",
      "builds": {
        "src": {"digest": false, "minify": false},
        "min": {"digest": false, "minify": true, "tag": "suffix", "sourceMap": "src"}
      },
      "targets": {
        "scripts.js": ["foo.js", "bar.js"]
      }
    }
```

This generates three files: `scripts.js`, `scripts-min.js` and
`scripts-min.js.map`, where the source map references `scripts.js` instead of
`foo.js` and `bar.js`.

By default, `wake` generates build settings for each group with a build called
`min` that's optimised for application development. If you specify your own
settings, these are the options you can set:

#### All asset types

* `digest` - set to `false` if you don't want content hashes in generated
  filenames
* `tag` - specifies where to put the build name in the generated filenames.
  * `prefix` puts the build name at the start of the filename, e.g.
    `min-scripts.js`
  * `suffix` puts the build name the end of the filename, e.g. `scripts-min.js`
  * `directory` puts the file inside a directory named for the build, e.g.
    `min/scripts.js`

#### JavaScript assets

* `minify` - set to `false` if you only want the files to be concatenated, not
  minified
* `safe` - set to `true` if you want the minifier to avoid potentially unsafe
  optimisations
* `separator` - sets the string inserted between files during concatenation, the
  default is two line feed characters
* `sourceMap` - set to `false` if you don't want a source map to be generated,
  set it to the name of a build (as above) if you want the map to reference that
  build as the source rather than the original source files

#### CSS assets

* `inline` - set to `true` if you want images, fonts and other files referenced
  by `url()` expressions to be inlined as data URIs
* `minify` - set to `false` if you only want the files to be concatenated, not
  minified
* `safe` - set to `true` if you want the minifier to avoid potentially unsafe
  optimisations
* `separator` - sets the string inserted between files during concatenation, the
  default is two line feed characters


### CSS asset hosts

If you're using multiple hostnames to serve assets from, you'll want to insert
these hostnames into the optimised CSS. You might have different hostnames for
HTTPS vs HTTP pages. To make `wake` add asset hosts to `url()` expressions, you
need to specifiy a few things in your `css` group config:

* `targetRoot` - this is the document root of the server that provides your
  static assets, it will often be the same as `sourceRoot`
* `hosts` - this is an index of all your asset hosts, indexed by environment and
  type
* `builds` - each build must say which type of host it should use, if any

Here's an example. We have two sets of asset hosts, one called `http` and one
called `https`. Each environment we deploy our app to has a different list of
hostnames for each set. The `hosts` setting below lists the hosts for each set
for the `production` and `staging` environments.

```js
    "css": {
      "sourceDirectory": "public/stylesheets",
      "targetDirectory": "public/assets",
      "sourceRoot":      "public",
      "targetRoot":      "public",
      "hosts": {
        "production": {
          "http":  ["http://static1.example.com", "http://static2.example.com"],
          "https": ["https://ssl1.example.com", "https://ssl2.example.com"]
        },
        "staging": {
          "http":  ["http://static1.staging.example.net", "http://static2.staging.example.net"],
          "https": ["https://ssl1.staging.example.net", "https://ssl2.staging.example.net"]
        }
      },
      "builds": {
        "min": {"hosts": "http"},
        "ssl": {"hosts": "https", "tag": "suffix"}
      },
      "targets": {
        "styles.css": ["navigation.css", "footer.css"]
      }
    }
```

The two `builds` here will generate two files: `styles.css` will use the `http`
set of hosts, and `styles-ssl.css` will use the `https` set. Which exact list of
hosts you get depends on the environment, which you specify on the command line:

```
$ WAKE_ENV=production wake
```

If you don't specify an environment, `wake` will use the host sets under
`hosts.default`, if you have specified a default set.


## License

(The MIT License)

Copyright (c) 2013 James Coglan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

