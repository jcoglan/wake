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

If you want to compile other languages to JS/CSS, that can be done as a separate
step using Make (or one of its clones), or by running tasks on file changes
using Guard.

Here's a few of the things `wake` will do with your files:

* Concatenate and minify JavaScript and CSS files
* Generate optimised files with a content hash in the filename
* Generate source maps for JavaScript with correct relative path references
* Resolve and inline CSS files referenced by `@import` statements
* Rewrite CSS `url()` paths so the optimised CSS references the same image/font
  files as the source code


## Installation

```
$ npm install -g wake
```


## Usage

`wake` is configured using data stored in your project's `package.json` file.
Its config has three sections: `javascript`, `css` and `binary`. Each section
has a `sourceDirectory`, which is the directory containing all the source files,
and a `targetDirectory`, which is where the optimised files are written to. The
only other required field is `targets`, which lists the name of each optimised
file and the names of the source files it should contain.

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

and generates the following files when you run `./node_modules/.bin/wake`:
remove_

```
.
├── .wake.json
└── public
    └── assets
        ├── .manifest.json
        ├── scripts.js
        ├── scripts-bb210c6.js
        ├── scripts.js.map
        ├── scripts-300b304.js.map
        ├── styles.css
        ├── styles-5a2ceb1.css
        ├── logo.png
        └── logo-2fa8d38.png
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
        "/home/jcoglan/projects/wake/public/javascripts/foo.js",
        "/home/jcoglan/projects/wake/public/javascripts/bar.js"
      ],
      "targets": {
        "min": "/home/jcoglan/projects/wake/public/assets/scripts.js"
      }
    }
  },
  "css": {
    "styles.css": {
      "sources": [
        "/home/jcoglan/projects/wake/public/stylesheets/navigation.css",
        "/home/jcoglan/projects/wake/public/stylesheets/footer.css"
      ],
      "targets": {
        "min": "/home/jcoglan/projects/wake/public/assets/styles.css"
      }
    }
  },
  "binary": {
    "logo.png": {
      "sources": [
        "/home/jcoglan/projects/wake/public/images/logo.png"
      ],
      "targets": {
        "min": "/home/jcoglan/projects/wake/public/assets/logo.png"
      }
    }
  }
}
```

The second metadata file in `.manifest.json`. This file is generated in each
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
  minified.
* `safe` - set to `true` if you want the minifier to avoid potentially unsafe
  optimisations
* `separator` - sets the string inserted between files during concatenation, the
  default is two line feed characters
* `sourceMap` - set to `false` if you don't want a source map to be generated,
  set it to the name of a build (as above) if you want the map to reference that
  build as the source rather than the original source files

#### CSS assets

* `inline` - set to `true` if you want the minifier to inline images, fonts and
  other files referenced by `url()` expressions to be inlined as data URIs
* `minify` - set to `false` if you only want the files to be concatenated, not
  minified.
* `safe` - set to `true` if you want the minifier to avoid potentially unsafe
  optimisations
* `separator` - sets the string inserted between files during concatenation, the
  default is two line feed characters



## License

(The MIT License)

Copyright (c) 2013 James Coglan

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

