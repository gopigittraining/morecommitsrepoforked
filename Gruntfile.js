module.exports = function( grunt ) {

	"use strict";

	var distpaths = [
			"dist/jquery.js",
			"dist/jquery.min.js"
		],
		readOptionalJSON = function( filepath ) {
			var data = {};
			try {
				data = grunt.file.readJSON( filepath );
			} catch(e) {}
			return data;
		};

	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		dst: readOptionalJSON("dist/.destination.json"),
		compare_size: {
			files: distpaths
		},
		selector: {
			"src/selector.js": [
				"src/sizzle-jquery.js",
				"src/sizzle/sizzle.js"
			]
		},
		build: {
			"dist/jquery.js": [
				"src/intro.js",
				"src/core.js",
				"src/callbacks.js",
				"src/deferred.js",
				"src/support.js",
				"src/data.js",
				"src/queue.js",
				"src/attributes.js",
				"src/event.js",
				"src/selector.js",
				"src/traversing.js",
				"src/manipulation.js",

				{ flag: "css", src: "src/css.js" },
				"src/serialize.js",
				{ flag: "ajax", src: "src/ajax.js" },
				{ flag: "ajax/script", src: "src/ajax/script.js", needs: ["ajax"]  },
				{ flag: "ajax/jsonp", src: "src/ajax/jsonp.js", needs: [ "ajax", "ajax/script" ]  },
				{ flag: "ajax/xhr", src: "src/ajax/xhr.js", needs: ["ajax"]  },
				{ flag: "effects", src: "src/effects.js", needs: ["css"] },
				{ flag: "offset", src: "src/offset.js", needs: ["css"] },
				{ flag: "dimensions", src: "src/dimensions.js", needs: ["css"] },
				{ flag: "deprecated", src: "src/deprecated.js" },

				"src/exports.js",
				"src/outro.js"
			]
		},

		jshint: {
			dist: {
				src: [ "dist/jquery.js" ],
				options: {
					jshintrc: "src/.jshintrc"
				}
			},
			grunt: {
				src: [ "Gruntfile.js" ],
				options: {
					jshintrc: ".jshintrc"
				}
			},
			tests: {
				// TODO: Once .jshintignore is supported, use that instead.
				// issue located here: https://github.com/gruntjs/grunt-contrib-jshint/issues/1
				src: [ "test/data/{test,testinit,testrunner}.js", "test/unit/**/*.js" ],
				options: {
					jshintrc: "test/.jshintrc"
				}
			}
		},

		testswarm: {
			tests: "ajax attributes callbacks core css data deferred dimensions effects event manipulation offset queue selector serialize support traversing Sizzle".split(" ")
		},

		watch: {
			files: [ "<%= jshint.grunt.src %>", "<%= jshint.tests.src %>", "src/**/*.js" ],
			tasks: "dev"
		},

		uglify: {
			all: {
				files: {
					"dist/jquery.min.js": [ "dist/jquery.js" ]
				},
				options: {
					banner: "/*! jQuery v<%= pkg.version %> jquery.com | jquery.org/license */",
					sourceMap: "dist/jquery.source-map.js",
					beautify: {
						ascii_only: true
					}
				}
			}
		}
	});

	grunt.registerTask( "testswarm", function( commit, configFile ) {
		var jobName,
			testswarm = require( "testswarm" ),
			testUrls = [],
			pull = /PR-(\d+)/.exec( commit ),
			config = grunt.file.readJSON( configFile ).jquery,
			tests = grunt.config([ this.name, "tests" ]);

		if ( pull ) {
			jobName = "jQuery pull <a href='https://github.com/jquery/jquery/pull/" +
				pull[ 1 ] + "'>#" + pull[ 1 ] + "</a>";
		} else {
			jobName = "jQuery commit #<a href='https://github.com/jquery/jquery/commit/" +
				commit + "'>" + commit.substr( 0, 10 ) + "</a>";
		}

		tests.forEach(function( test ) {
			testUrls.push( config.testUrl + commit + "/test/index.html?module=" + test );
		});

		testswarm({
			url: config.swarmUrl,
			pollInterval: 10000,
			timeout: 1000 * 60 * 30,
			done: this.async()
		}, {
			authUsername: config.authUsername,
			authToken: config.authToken,
			jobName: jobName,
			runMax: config.runMax,
			"runNames[]": tests,
			"runUrls[]": testUrls,
			"browserSets[]": config.browserSets
		});
	});

	// Build src/selector.js
	grunt.registerMultiTask( "selector", "Build src/selector.js", function() {

		var name = this.file.dest,
				files = this.file.src,
				sizzle = {
					api: grunt.file.read( files[0] ),
					src: grunt.file.read( files[1] )
				},
				compiled, parts;

		/**

			sizzle-jquery.js -> sizzle between "EXPOSE" blocks,
			replace define & window.Sizzle assignment


			// EXPOSE
			if ( typeof define === "function" && define.amd ) {
				define(function() { return Sizzle; });
			} else {
				window.Sizzle = Sizzle;
			}
			// EXPOSE

			Becomes...

			Sizzle.attr = jQuery.attr;
			jQuery.find = Sizzle;
			jQuery.expr = Sizzle.selectors;
			jQuery.expr[":"] = jQuery.expr.pseudos;
			jQuery.unique = Sizzle.uniqueSort;
			jQuery.text = Sizzle.getText;
			jQuery.isXMLDoc = Sizzle.isXML;
			jQuery.contains = Sizzle.contains;

		 */

		// Break into 3 pieces
		parts = sizzle.src.split("// EXPOSE");
		// Replace the if/else block with api
		parts[1] = sizzle.api;
		// Rejoin the pieces
		compiled = parts.join("");

		grunt.verbose.write("Injected sizzle-jquery.js into sizzle.js");

		// Write concatenated source to file
		grunt.file.write( name, compiled );

		// Fail task if errors were logged.
		if ( this.errorCount ) {
			return false;
		}

		// Otherwise, print a success message.
		grunt.log.writeln( "File '" + name + "' created." );
	});


	// Special "alias" task to make custom build creation less grawlix-y
	grunt.registerTask( "custom", function() {
		var done = this.async(),
				args = [].slice.call(arguments),
				modules = args.length ? args[0].replace(/,/g, ":") : "";


		// Translation example
		//
		//   grunt custom:+ajax,-dimensions,-effects,-offset
		//
		// Becomes:
		//
		//   grunt build:*:*:+ajax:-dimensions:-effects:-offset

		grunt.log.writeln( "Creating custom build...\n" );

		grunt.util.spawn({
			cmd: process.platform === "win32" ? "grunt.cmd" : "grunt",
			args: [ "build:*:*:" + modules, "uglify" ]
		}, function( err, result ) {
			if ( err ) {
				grunt.verbose.error();
				done( err );
				return;
			}

			grunt.log.writeln( result.stdout.replace("Done, without errors.", "") );

			done();
		});
	});

	// Special concat/build task to handle various jQuery build requirements
	//
	grunt.registerMultiTask(
		"build",
		"Concatenate source (include/exclude modules with +/- flags), embed date/version",
		function() {
			// Concat specified files.
			var compiled = "",
				modules = this.flags,
				optIn = !modules["*"],
				explicit = optIn || Object.keys(modules).length > 1,
				name = this.file.dest,
				src = this.file.srcRaw,
				deps = {},
				excluded = {},
				version = grunt.config( "pkg.version" ),
				excluder = function( flag, needsFlag ) {
					// optIn defaults implicit behavior to weak exclusion
					if ( optIn && !modules[ flag ] && !modules[ "+" + flag ] ) {
						excluded[ flag ] = false;
					}

					// explicit or inherited strong exclusion
					if ( excluded[ needsFlag ] || modules[ "-" + flag ] ) {
						excluded[ flag ] = true;

					// explicit inclusion overrides weak exclusion
					} else if ( excluded[ needsFlag ] === false &&
						( modules[ flag ] || modules[ "+" + flag ] ) ) {

						delete excluded[ needsFlag ];

						// ...all the way down
						if ( deps[ needsFlag ] ) {
							deps[ needsFlag ].forEach(function( subDep ) {
								modules[ needsFlag ] = true;
								excluder( needsFlag, subDep );
							});
						}
					}
				};

			// append commit id to version
			if ( process.env.COMMIT ) {
				version += " " + process.env.COMMIT;
			}

			// figure out which files to exclude based on these rules in this order:
			//  dependency explicit exclude
			//  > explicit exclude
			//  > explicit include
			//  > dependency implicit exclude
			//  > implicit exclude
			// examples:
			//  *                  none (implicit exclude)
			//  *:*                all (implicit include)
			//  *:*:-css           all except css and dependents (explicit > implicit)
			//  *:*:-css:+effects  same (excludes effects because explicit include is trumped by explicit exclude of dependency)
			//  *:+effects         none except effects and its dependencies (explicit include trumps implicit exclude of dependency)
			src.forEach(function( filepath ) {
				var flag = filepath.flag;

				if ( flag ) {

					excluder(flag);

					// check for dependencies
					if ( filepath.needs ) {
						deps[ flag ] = filepath.needs;
						filepath.needs.forEach(function( needsFlag ) {
							excluder( flag, needsFlag );
						});
					}
				}
			});

			// append excluded modules to version
			if ( Object.keys( excluded ).length ) {
				version += " -" + Object.keys( excluded ).join( ",-" );
				// set pkg.version to version with excludes, so minified file picks it up
				grunt.config.set( "pkg.version", version );
			}


			// conditionally concatenate source
			src.forEach(function( filepath ) {
				var flag = filepath.flag,
						specified = false,
						omit = false,
						message = "";

				if ( flag ) {
					if ( excluded[ flag ] !== undefined ) {
						message = ( "Excluding " + flag ).red;
						specified = true;
						omit = true;
					} else {
						message = ( "Including " + flag ).green;

						// If this module was actually specified by the
						// builder, then st the flag to include it in the
						// output list
						if ( modules[ "+" + flag ] ) {
							specified = true;
						}
					}

					// Only display the inclusion/exclusion list when handling
					// an explicit list.
					//
					// Additionally, only display modules that have been specified
					// by the user
					if ( explicit && specified ) {
						grunt.log.writetableln([ 27, 30 ], [
							message,
							( "(" + filepath.src + ")").grey
						]);
					}

					filepath = filepath.src;
				}

				if ( !omit ) {
					compiled += grunt.file.read( filepath );
				}
			});

			// Embed Version
			// Embed Date
			compiled = compiled.replace( /@VERSION/g, version )
				.replace( "@DATE", function () {
					var date = new Date();

					// YYYY-MM-DD
					return [
						date.getFullYear(),
						date.getMonth() + 1,
						date.getDate()
					].join( "-" );
				});

			// Write concatenated source to file
			grunt.file.write( name, compiled );

			// Fail task if errors were logged.
			if ( this.errorCount ) {
				return false;
			}

			// Otherwise, print a success message.
			grunt.log.writeln( "File '" + name + "' created." );
		});

	// Allow custom dist file locations
	grunt.registerTask( "dist", function() {
		var flags, paths, stored;

		// Check for stored destination paths
		// ( set in dist/.destination.json )
		stored = Object.keys( grunt.config("dst") );

		// Allow command line input as well
		flags = Object.keys( this.flags );

		// Combine all output target paths
		paths = [].concat( stored, flags ).filter(function( path ) {
			return path !== "*";
		});

		// Ensure the dist files are pure ASCII
		var fs = require("fs"),
			nonascii = false;

		distpaths.forEach(function( filename ) {
			var buf = fs.readFileSync( filename, "utf8" ),
			i, c;
			if ( buf.length !== Buffer.byteLength( buf, "utf8" ) ) {
				grunt.log.writeln( filename + ": Non-ASCII characters detected:" );
				for ( i = 0; i < buf.length; i++ ) {
					c = buf.charCodeAt( i );
					if ( c > 127 ) {
						grunt.log.writeln( "- position " + i + ": " + c );
						grunt.log.writeln( "-- " + buf.substring( i - 20, i + 20 ) );
						nonascii = true;
					}
				}
			}
		});
		if ( nonascii ) {
			return false;
		}

		// Proceed only if there are actual
		// paths to write to
		if ( paths.length ) {

			// 'distpaths' is declared at the top of the
			// module.exports function scope. It is an array
			// of default files that jQuery creates
			distpaths.forEach(function( filename ) {
				paths.forEach(function( path ) {
					var created;

					if ( !/\/$/.test( path ) ) {
						path += "/";
					}

					created = path + filename.replace( "dist/", "" );

					grunt.file.write( created, grunt.file.read(filename) );

					grunt.log.writeln( "File '" + created + "' created." );
				});
			});
		}
	});

	// Load grunt tasks from NPM packages
	grunt.loadNpmTasks( "grunt-compare-size" );
	grunt.loadNpmTasks( "grunt-git-authors" );
	grunt.loadNpmTasks( "grunt-update-submodules" );

	// grunt contrib tasks
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-uglify");

	// Default grunt
	grunt.registerTask( "default", [ "update_submodules", "selector", "build:*:*", "jshint", "uglify", "dist:*", "compare_size" ] );

	// Short list as a high frequency watch task
	grunt.registerTask( "dev", [ "selector", "build:*:*", "jshint" ] );
};
