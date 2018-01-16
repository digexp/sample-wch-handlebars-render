/*
 * Copyright 2017 IBM Corp.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License Na
 * http://www.apache.org/licenses/LICENSE-2.0 
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 */
'use strict';

// use module pattern to protect private vars
var __SPNS__ = (() => {

/****************************************************************************************************
*
*	List of all available Handlebars templates by mode and content type
*	Edit this list to add or remove templates for each mode and content type pair
*	The object mirrors the file structure under the /dx-script-application/hbs-templates/ directory
*
*****************************************************************************************************/
const _availableTemplates = {
	'content': [
		{
			'typeName': 'Article',
			'templates': [
				'default.html',
				'banner-text-on-left.html',
				'text-below.html',
				'text-overlaid.html',
				'title-and-summary.html'
			]
		}
	],
	'list': [
		{
			'typeName': 'Article',
			'templates': [
				'default.html',
				'carousel.html',
				'image-with-text-above.html',
				'image-with-text-below.html',
				'table-display.html',
				'text-with-popup-details.html'
			]
		}
	]
};

// contants and defaults
const _usePicker = true;
const _baseTenantUrl = 'https://dch-dxcloud.rtp.raleigh.ibm.com/api/8b9a825d-7b9b-4bfa-8c35-24d3951ba370';
//const _baseTenantUrl = '{Tenant API URL}';	// Set your base tenant API URL here TODO
const _deliveryPaletteUrl = 'https://www.digitalexperience.ibm.com/content-picker/picker.html?apiUrl=' + _baseTenantUrl + '&fq=classification:content&fq=type:';
const _templateFolder = 'hbs-templates/';
const _contentModeContent = 'content';	// single content item mode, default
const _contentModeSearch = 'list';		// search results list mode

// the current selection, start off with some default values
let _selectedContent = {
	contentMode: _contentModeContent,
	template: 'default.html',
	contentType: 'Article',
	contentId: '',
	contentName: '',
	searchTags: '',
	numSearchRows: '3'
};

/********************************
*	Setup API and helper objects
*********************************/

let _wchRenderer = new __SPNS__WCHRenderer({
	baseTenantURL: _baseTenantUrl
	//, debug: true
});

// initialize the Script App helper/API object
let _saInstance = null;
if (typeof __SPNS__spHelper !== 'undefined') {
	_saInstance = __SPNS__spHelper;
}

// Save native promise - restore it after making call to preferences API, which sets Promise
let _nativePromise;
if (typeof _nativePromise === 'undefined') {
	_nativePromise = Promise;
}

/************************
*	Rendering functions
*************************/

// Render the content on page load, ONLY when the page is in view mode.
// Rendering when the page is in edit mode does not work, as the dojo package clashes with Handlebars.
document.addEventListener('DOMContentLoaded', (() => {
	if (!editMode || !_saInstance) {
		renderContentUsingPrefs();
	}
}));

// Retrieve portlet preferences and render WCH content based on current selections.
function renderContentUsingPrefs() {

	// in the Portal context
	if(_saInstance) {
		_saInstance.getPortletPreferences().then(prefs => {
			if (_nativePromise) {
				Promise = _nativePromise;	// restore native Promise object
			}
			if (prefs) {
				_selectedContent = prefs;
			}
			renderContent(_selectedContent, '__SPNS__wchContentResult');
		});

	// outside the Portal context, preferences are not saved
	} else {
		renderContent(_selectedContent, '__SPNS__wchContentResult');
	}
}

// Render content item or search results at the specified location ID.
function renderContent(selContent, renderLocationId) {

	if(_wchRenderer.debug) console.log('Rendering with selected content: %o', _selectedContent);
	const noRenderMsg = 'Nothing to render yet, pick a new content item or search query in edit mode.';

	// do not render if the page is in edit mode
	if(editMode && _saInstance) {
		document.getElementById(renderLocationId).innerHTML = 'Turn edit mode off to see the rendered content.';

	// do a search with any available tags to retrieve the search results list
	} else if (selContent.contentMode === _contentModeSearch && selContent.contentType && selContent.template) {

		// retrieve the Handlebar template
		getHandlebarTemplate(_templateFolder + _contentModeSearch + '/' + selContent.contentType + '/' + selContent.template).then(templateStr => {

			// get the search results list, with tags, and feed it to the WCH renderer with the Handlebar template
			let searchParams = 'fq=type:' + selContent.contentType + '&sort=lastModified%20desc&rows=' + selContent.numSearchRows;
			if (selContent.searchTags) {
				searchParams += '&fq=tags:(' + selContent.searchTags.split(',').join(' OR ') + ')';
			}
			return _wchRenderer.renderSearch(searchParams, templateStr, renderLocationId);

		}).catch(err => {
			document.getElementById(renderLocationId).innerHTML = noRenderMsg;
			_displayError(`Could not render search "${searchParams}".`, [`Error rendering search with params "${searchParams}" : ${err}`]);
		});

	// Single content item mode
	} else if (selContent.contentId && selContent.template) {

		// retrieve the Handlebar template and feed it to the WCH renderer with the content item ID
		getHandlebarTemplate(_templateFolder + _contentModeContent + '/' + selContent.contentType + '/' + selContent.template).then(templateStr => {
			return _wchRenderer.renderItem(selContent.contentId, templateStr, renderLocationId);

		}).catch(err => {
			document.getElementById(renderLocationId).innerHTML = noRenderMsg;
			_displayError(`Could not render content with ID "${selContent.contentId}".`, [`Error rendering content with ID "${selContent.contentId}" : ${err}`]);
		});

	// no search or content set yet
	} else {
		document.getElementById(renderLocationId).innerHTML = noRenderMsg;
	}
}

/*********************************************
*	Configuration UI dialog & form functions
**********************************************/

// Initialize the "Select WCH Content" configuration UI dialog, called from the "Select content from Watson Content Hub" button (only available in edit mode).
function initDialog() {

	// update form based on currently selected content
	let updateForm = (selContent) => {
		__SPNS__contentModeContentButton.checked = selContent.contentMode !== _contentModeSearch;
		__SPNS__contentModeSearchButton.checked = selContent.contentMode === _contentModeSearch;
		__SPNS__templateSelector.value = selContent.template;
		__SPNS__contentTypeSelector.value = selContent.contentType;
		__SPNS__contentItemSelector.value = selContent.contentId;
		__SPNS__contentItemText.innerHTML = selContent.contentName ?  selContent.contentName + '&nbsp;&nbsp;&nbsp;&nbsp;' : '';
		__SPNS__searchTagsInput.value = selContent.searchTags || '';
		__SPNS__rowsInput.value = selContent.numSearchRows || '3';
		__SPNS__wchContentError.style.display = 'none';
		__SPNS__tagsInputError.style.display = 'none';
		__SPNS__rowsInputError.style.display = 'none';
		updateFieldVisibility();
	}

	// the currently selected content info is saved as portlet preferences
	if(_saInstance) {
		_saInstance.getPortletPreferences().then(prefs => {
			if (_nativePromise) {
				Promise = _nativePromise;
			}
			if (prefs) {
				_selectedContent = prefs;
			}
			updateForm(_selectedContent);
		});

	// outside the Portal context
	} else {
		updateForm(_selectedContent);
	}
}

// Show or hide the "Single content item" or "Search result list" panels in the "Selection WCH Content" configuration UI dialog,
// based on the current mode. Called on dialog initialization or when the user clicks the radio buttons to switch panels.
function updateFieldVisibility() {

	// get the mode from the UI form
	_selectedContent.contentMode = __SPNS__contentModeSearchButton.checked ? _contentModeSearch : _contentModeContent;
	initTypeSelector();

	// Search results list mode : Single content item mode
	const listMode = _selectedContent.contentMode === _contentModeSearch;
	__SPNS__rowsInputContainer.style.display = listMode ? 'block' : 'none';
	__SPNS__tagsInputContainer.style.display = listMode ? 'block' : 'none';
	__SPNS__contentItemSelectorContainer.style.display = listMode ? 'none' : 'block';
	if (listMode) __SPNS__contentModeSearchButton.checked = true;
	else __SPNS__contentModeContentButton.checked = true;

	// Content item picker mode : Content item dropdown mode
	__SPNS__contentItemSelector.style.display = _usePicker ? 'none' : 'block';
	__SPNS__contentItemText.style.display = _usePicker ? 'block' : 'none';
	__SPNS__pickerBtn.style.display = _usePicker ? 'inline' : 'none';
}

// Populate the "Content type" select menu based on the current content mode.
function initTypeSelector() {

	const typeList = getTypesFromMode(_selectedContent.contentMode);
	if(typeList) {

		// turn the array of content types and templates into a string of HTML <option>s: <option value="Type">Type</option>
		let formOptions = typeList.reduce((options, type) => options + '<option value="' + type.typeName + '">' + type.typeName + '</option>', '');

		// update the "Content type" form select menu with the HTML options
		__SPNS__contentTypeSelector.innerHTML = formOptions;
		__SPNS__contentTypeSelector.value = _selectedContent.contentType;
		handleTypeSelectChange();
	}
}

// Update the "Template" and "Content item" select menus, according to changes made in the "Content type" select menu.
function handleTypeSelectChange() {
	const contentType = __SPNS__contentTypeSelector.value;
	if (contentType) {
		_selectedContent.contentType = contentType;
		populateTemplatePicker(_selectedContent.contentMode, contentType);
	}
	if(!_usePicker) populateContentPicker();
}

// Populate the "Template" select menu based on content type and mode ('content' or 'list').
function populateTemplatePicker(mode, contentType) {

	const templateList = getTemplatesFromModeAndType(mode, contentType);
	if(templateList) {

		// Make a <select><option>s list of available templates for the current mode and content type: <option value="template.html">template</option>
		let formOptions = templateList.reduce((options, template) => {
			return options + '<option value="' + template + '">' + template.replace('.html', '') + '</option>';
		}, '');

		// update the "Template" form select menu with the HTML options
		__SPNS__templateSelector.innerHTML = formOptions;
		__SPNS__templateSelector.value = _selectedContent.template || templateList[0];
	}
}

// Populate the "Content item" select menu.
function populateContentPicker() {

	// do a search for content items of the current Type
	const searchParams = ('q=*:*&fl=*&fq=classification:content&fq=type:' + _selectedContent.contentType + '&rows=200').replace(' ', '%5C ');
	return _wchRenderer.queryWCH('search?' + searchParams).then(result => {

		if(result.documents) {
			// turn the array of content item documents into a string of HTML <option>s: <option value="content item ID">Conten item name</option>
			let formOptions = result.documents.reduce((options, doc) => options + '<option value="' + doc.id.replace('content:', '') + '">' + doc.name + '</option>', '');

			// set "Content item" options and current value
			__SPNS__contentItemSelector.innerHTML = formOptions;
			if (_selectedContent.contentId) {
				__SPNS__contentItemSelector.value = _selectedContent.contentId;
			}

		// there are no content items of the given Type
		} else {
			_displayError(`There are no content items available for type "${_selectedContent.contentType}". Please ensure content exists for this type in WCH.`, [`No content items available for type "${_selectedContent.contentType}", with selected content object: %o. Make sure items for this type exist in WCH and the "_selectedContent" JSON object is filled out properly.`, _selectedContent]);
		}

	}).catch(reason => {
		const baseErrStr = `Could not retrieve the list of content items for Type "${_selectedContent.contentType}"`;
		_displayError(`${baseErrStr}.`, [`${baseErrStr}: ${reason}`]);
	});
}

// Save preferences, close the configuration UI dialog, and render updated content.
function saveAndClose() {

	// gather the user input
	_selectedContent.contentMode = __SPNS__contentModeSearchButton.checked ? _contentModeSearch : _contentModeContent;
	_selectedContent.template = __SPNS__templateSelector.value;
	_selectedContent.contentType = __SPNS__contentTypeSelector.value;
	if (!_usePicker && __SPNS__contentItemSelector.options[__SPNS__contentItemSelector.selectedIndex]) {
		_selectedContent.contentId = __SPNS__contentItemSelector.options[__SPNS__contentItemSelector.selectedIndex].value;
	}
	_selectedContent.searchTags = _escapeSolr(__SPNS__searchTagsInput.value.trim());
	_selectedContent.numSearchRows = _isPositiveInt(__SPNS__rowsInput.value.trim());

	// display errors based on sanitized user input
	__SPNS__tagsInputError.style.display = _selectedContent.searchTags === false ? 'block' : 'none';
	__SPNS__rowsInputError.style.display = _selectedContent.numSearchRows === false ? 'block' : 'none';

	// render the content if the user input is ok
	if(_selectedContent.searchTags !== false && _selectedContent.numSearchRows !== false) {
		$('#__SPNS__preferences-modal').modal('hide');
		// persist the changes to the portlet preferences
		if(_saInstance) {
			_saInstance.setPortletPreferences(_selectedContent).then(result => {
				if (_nativePromise) {
					Promise = _nativePromise;
				}
				renderContent(_selectedContent, '__SPNS__wchContentResult');
			}, err => {
				// Here you would handle error conditions from getting the preference.
				// Ignore the error 0001, which is received when not running within a portal context.
				if (err.message.toString().indexOf('ERR0001:') !== 0) {
					_displayError(`Could not save to portlet preferences: ${err.name} - ${err.message}`);
				}
			});

		// outside the Portal context
		} else {
			renderContent(_selectedContent, '__SPNS__wchContentResult');
		}
	}
}

/*********************************************
*	_availableTemplates data manipulation
**********************************************/

// given a mode ('content' or 'list') return the list of content types, or null if none exist
function getTypesFromMode(mode) {

	// get the list from the _availableTemplates JSON object
	const typeList = _availableTemplates[mode];
	if(typeList && typeList.length) {
		return typeList;

	// there are no content types for the current mode
	} else {
		_displayError(`There are no content types available for displaying as "${_selectedContent.contentMode === 'list' ? 'a search result list' : 'single content items'}".`, [`No content types available for mode "${_selectedContent.contentMode}", with selected content object: %o. Make sure the "_availableTemplates" JSON object is filled out properly.`, _selectedContent]);
		return null;
	}
}

// given a mode ('content' or 'list') and content type, return the list templates, or null if none exist
function getTemplatesFromModeAndType(mode, contentType) {

	// first get the list of content types for the mode
	const typeList = getTypesFromMode(mode);
	if(typeList) {

		// get the list from the _availableTemplates JSON object
		const templateType = typeList.find(type => type.typeName === contentType);
		if(templateType && templateType.templates && templateType.templates.length) {
			return templateType.templates;

		// there are no templates for the current mode and content type
		} else {
			_displayError(`There are no templates available for the "${contentType}" content type.`, [`No templates available for mode "${_selectedContent.contentMode}" and content type "${contentType}", with selected content object: %o. Make sure the "_availableTemplates" JSON object is filled out properly.`, _selectedContent]);
			return null;
		}

	// no types
	} else {
		return null;
	}
}

/**********************
*	WCH Picker Palette
***********************/

// 'addEventListener' is for standards-compliant web browsers and 'attachEvent' otherwise
const _eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
const _eventer = window[_eventMethod];
// 2. if 'attachEvent', then we need to select 'onmessage' as the event else if 'addEventListener', then we need to select 'message' as the event
const _messageEvent = _eventMethod === 'attachEvent' ? 'onmessage' : 'message';

// Load the picker and listen to message from child iFrame window.
function launchPicker() {
	$('#__SPNS__pickerIframe').attr('src', _deliveryPaletteUrl + _selectedContent.contentType);
	_eventer(_messageEvent, handlePaletteResult, false);
}

// Get the event from the picker, and parse out the content item's ID and Name
function handlePaletteResult(event) {
	$('#__SPNS__contentPickerDialog').modal('toggle')
	const pickerData = JSON.parse(event.data);
	if(_wchRenderer.debug) console.log('Data from WCH picker palette: %o', pickerData);
	if(pickerData.id) {
		_selectedContent.contentId = pickerData.id;
		_selectedContent.contentName = pickerData.name;
		__SPNS__contentItemText.innerHTML = pickerData.name + '&nbsp;&nbsp;&nbsp;&nbsp;';
	}
}

/*******************
*	Template XHR
********************/

// Do an XHR for the Handlebars template with the given path, return a Promise for the template string
function getHandlebarTemplate(path) {

	if(_wchRenderer.debug) console.log('Rendering with local path: %o', path);
	path = getLocalPath(path);
	if(_wchRenderer.debug) console.log('Rendering with WCM path: %o', path);

	// return a new promise for the template
	return new Promise((resolve, reject) => {
		const req = new XMLHttpRequest();
		req.onload = resolve;
		req.withCredentials = true;
		req.onerror = () => {
			reject(`There was a network error retrieving the template with path => ${path}`);
		};
		req.open('GET', path);
		req.send();
	}).

	// extract the XHR from the event
	then(event => event.target).

	// extract the response body from the xhr request
	then(req => req.responseText);
}

// get the Portal path for a file or directory
function getLocalPath(path) {
	const ret = _saInstance && _saInstance.getElementURL ? _saInstance.getElementURL(path) : path;
	if(!ret) {
		_displayError(`Cannot find Handlebar template path: ${ret}`);
	}
	return ret;
}

/**************
*	Helpers
***************/

function _displayError(/*String*/userStr, /*Array*/consoleArgs) {
	$('#__SPNS__preferences-modal').modal('hide');
	if(userStr) {
		consoleArgs = consoleArgs || [userStr];
		console.error.apply(this, consoleArgs);
		__SPNS__wchContentError.innerHTML = userStr;
		__SPNS__wchContentError.style.display = 'block';
	}
}

function _escapeSolr(str) {
	/* special characters in Solr queries: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ */
	// avoid: # % & ;
	return str.search(/[#%\&;]/) < 0 ? str.replace(/[\+\-\|\!\(\)\{\}\[\]\^"~\*\?\:\\\/]/g, (s) => '\\' + s) : false;
}

function _isPositiveInt(str) {
	const maybeInt = parseInt(str);
	return (String(maybeInt) === str && maybeInt > 0) ? str : false;
}

// expose some functions publicly
return {
	initDialog: initDialog,
	updateFieldVisibility: updateFieldVisibility,
	handleTypeSelectChange: handleTypeSelectChange,
	saveAndClose: saveAndClose,
	launchPicker: launchPicker
};

})();
