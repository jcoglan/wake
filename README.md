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
files that an application can easily find out which files in should generate
links to.

If you want to compile other languages to JS/CSS, that can be done as a separate
step using Make (or one of its clones), or by running tasks on file changes
using Guard.

Here's a few of the things `wake` will do with your files:

* Concatenate and minify JavaScript and CSS files
* Generate optimised files with a content hash in the filename
* Generate source maps for JavaScript with correct relative path references
* Resolve and inline CSS files referenced by `@import` statements
* Rewrite CSS `url()` paths so the compiled CSS references the same image/font
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

and generates the following files:

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

Two copies of each target are generated: one with a content hash in the filename
and one without. The hashed names are for applications that can dynamically
detect which files to serve, and the hashes serve to make the files indefinitely
cacheable. The un-hashed names are for things that need predictable filenames,
like the static page outside your web stack that runs your JS tests.


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

