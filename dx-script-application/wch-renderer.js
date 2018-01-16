/*
 * Copyright 2017 IBM Corp.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
"use strict";

class __SPNS__WCHRenderer {

	/******************
	*	Configuration 
	*******************/
	constructor(settings) {
		this.baseTenantURL = settings.baseTenantURL;
		this.baseDeliveryURL = this.baseTenantURL + '/delivery/v1/';
		this.debug = (settings.debug ? settings.debug: false);

		(() => {
			// get server root URL from base API URL
			let i = this.baseTenantURL.indexOf('://');
			if (i > -1) {
				var iSlash = this.baseTenantURL.indexOf('/', i + 3);
				this.baseServerURL = this.baseTenantURL.substring(0, iSlash);
			} else {
				throw new Error('Invalid URL: ' + this.baseTenantURL);
			}
		})();

		if(this.debug) {
			console.log('Settings: ', {
				baseTenantURL: this.baseTenantURL,
				debug: this.debug
			});
		}
	}

	/***********************************
	*	Rendering a single content item 
	************************************/

	// Render specified content item with the given template, at the tag with ID displayLocationId
	renderItem(contentId, template, displayLocationId) {

		if(this.debug) console.log('Fetching content item with ID: ', contentId);

		// find the target node
		var targetNode = document.getElementById(displayLocationId);
		if (!targetNode) {
			return Promise.reject("Can't find element with ID ", displayLocationId);
		}	

		// get the content item and feed it to the Handlebar template
		return this.queryWCH('content/' + contentId).then(contentItem => {
			if(this.debug) console.log('Rendering with local template, content item: %o', contentItem);
			this.fixContentUrls(contentItem);
			targetNode.innerHTML = Handlebars.compile(template)(contentItem);
		});
	}

	/******************
	*	Search 
	*******************/

	// Render specified search using specified remote template, at the tag with ID displayLocationId
	renderSearch(searchParams, template, displayLocationId) {

		if(this.debug) console.log('Fetching search results for params: ', searchParams);

		// find the target node
		var targetNode = document.getElementById(displayLocationId);
		if (!targetNode) {
			return Promise.reject("Can't find element with ID ", displayLocationId);
		}

		// get the search results and feed them to the Handlebar template
		return this.getSearchResults(searchParams).then(documents => {
			if(this.debug) console.log('Rendering with local template, search results: ', documents);
			if (documents) {
				this.fixContentUrls(documents);
				const searchResults = documents.map(doc => doc.document);
				targetNode.innerHTML = Handlebars.compile(template)({ searchResults });
			}
		});
	}

	// construct the search URL and return the list of documents
	getSearchResults(searchParams) {
		searchParams = searchParams.replace(' ', '%5C ');
		const baseSearchParams = 'q=*:*&fl=id,document:[json]&fq=classification:(content)';
		return this.queryWCH('search?' + baseSearchParams + '&' + searchParams).then(result => result.documents );
	}

	/******************
	*	Helpers 
	*******************/

	// Do a query to the WCH delivery URL.
	queryWCH(url) {
		url = this.baseDeliveryURL + url;

		// return a new promise for the search
		return new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.onload = resolve;
			req.withCredentials = true;
			req.onerror = () => {
				reject(`There was a network error sending a request to WCH => ${url}`);
			};
			if(this.debug) console.log('Sending HTTP GET to WCH delivery url: ', url);
			req.open('GET', url);
			req.send();
		}).

		// extract the XHR from the event
		then(event => event.target).

		// extract the response body from the xhr request
		then(req => req.responseText).

		// parse the JSON
		then(JSON.parse);
	}

	// Add server to URLs within content item
	fixContentUrls(obj) {
		for (var k in obj) {
			if (k == 'url') {
				obj[k] = this.baseServerURL + obj[k];
			}
			if (typeof obj[k] == 'object' && obj[k] !== null) {
				this.fixContentUrls(obj[k]);
			}
		}
	}
}
