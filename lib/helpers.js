'use strict';

// nodejs
var path = require('path'),
	fs = require('fs-extra');

// third-party
var nunjucks = require('nunjucks');

function Helpers () {
	// a shared-state singleton that can be used by any module of the template
	
	// configure nunjucks with our known templates - this could become dynamic via runtime options
	// if done later (in init)
	nunjucks.configure(path.resolve(process.cwd(), './templates'), { autoescape: false, throwOnUndefined: false });
}

Helpers.prototype = {
	
	_paths: [],
	
	_links: {},
	
	/**
	* Called once by the template early in the process to give it a reference to the original
	* options hash and the database so helper methods don't need to be passed those parameters
	* every time they are called. Also other various tid-bit initialization tasks.
	*/
	init: function (db, opts) {
		this.db = db;
		this.opts = opts;
		this.outputRootPath = path.resolve(process.cwd(), opts.destination);
		this.initDatabase();
	},
	
	/**
	* Any general database normalization tasks should be accomplished here before it is accessed
	* for specific doclet related processing. Anything we can remove from the database speeds up
	* the template significantly and the overhead of checking things over and over later.
	*/
	initDatabase: function () {
		var db = this.db;
		
		// remove extraneous entries from the database, it is possible during future revision we
		// could have debugging that would actually analyze these items to see what we're missing
		db({undocumented: true}).remove();
		db({ignore: true}).remove();
		db({memberof: '<anonymous>'}).remove();
		
		// TODO: This is temporarily necessary because anything with @alias is not working as
		// intended!!!!
		db({alias: {isUndefined: false}}).remove();
	},
	
	/**
	* Attempt to resolve a template by name from nunjucks and apply the given scope to it, return
	* the rendered content.
	*/
	render: function (nom, scop) {
		return nunjucks.render(nom, scop);
	},
	
	/**
	*
	*/
	publish: function (filenom, content) {
		fs.outputFileSync(path.resolve(this.outputRootPath, filenom), content);
	},
	
	/**
	*
	*/
	linkFor: function (nom) {
		return nom && this._links[nom];
	},
	
	/**
	*
	*/
	addLinkFor: function (nom, link) {
		this._links[nom] = link;
	},
	
	/**
	*
	*/
	buildHref: function (elem) {
		var href = this.hrefFor(elem);

		if(href) {
			this.addLinkFor(elem, href);
		}
		return href;
	},
	/**
	*
	*/
	hrefFor: function (elem) {
		var db = this.db,
			doclet = db({longname: elem}).first(),
			href,
			kind;
	
		if (!doclet) { /* console.log(elem); */ return false; }

		kind = doclet.kind;
	
		// if the kind is class we use the word 'kind' instead arbitrarily because, well, this is
		// for enyo after all
		if (kind == 'class') kind = 'kind';

		elem = elem.replace('~:', '');
		if(((kind != 'kind') && (kind != 'module') && (kind != 'mixin')) && (elem.indexOf('module:') > -1)) {
			href = this.hrefFor(doclet.memberof);
			if(href) {
				return href + ':' + doclet.name;
			} else {
				elem = doclet.memberof + ':' + doclet.name;
				if(doclet.memberof.match(/~/)) {	// Assume ~ means it's a kind from a module
					kind = 'kind';
				} else {
					kind = 'module';
				}
			}
		}
		elem = elem.replace('~', '/');
		elem = elem.replace('module:', '');
		href = '#/' + kind + '/' + elem;
		return href;
	},
	
	/**
	*
	*/
	error: function () {
		var logger = require('jsdoc/util/logger');
		logger.error.apply(logger, arguments);
	}
};

/**
* Export the singleton instance (strictly for convenience). Methods to be part of the helpers
* singleton can add methods to the prototype object and safely use the `this` property to refer
* to the helpers instance.
*/
module.exports = new Helpers();
