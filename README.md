# WCH rendered content sample script application for IBM Digital Experience
This is a sample script application for IBM Digital Experience (DX) 8.5 or 9.0. It lets you display a single content item or a search results list for a selected WCH content type on a DX page. To render the content it uses Handlebars templates that are stored in Watson Content Hub (WCH). Several Handlebars templates are provided with the sample.


This screenshot shows a Portal page with two instances of this application. The top instance shows a single "Hero Banner" content item and the bottom instance shows a search for articles.
![single item and list content rendering](docs/dx-script-app.jpg?raw=true "Sample screenshot")

This shows the configuration UI for selecting a content item or search parameters.
![content configuration](docs/dx-script-app-configuration.jpg?raw=true "Sample configuration screenshot")


## Installing and running the sample

#### 1. Download the files

Download and unpack the entire project folder into any folder on your workstation.

#### 2. Update the URL value to match your tenant

Replace `{Tenant API URL}` in `/dx-script-application/app.js` with the value from the "Watson Content Hub Information" dialog.

#### 3. Upload "Sample Article" content

The templates provided with this sample use the "Sample Article" content type. Follow the instructions at the [sample-article-content](https://github.com/ibm-wch/sample-article-content) repository, to download and push the "Sample Article" type and associated authoring artifacts, for your Content Hub tenant.

#### 4. Enable CORS support for your tenant

For this scenario you will need to enable CORS support for your tenant. To control the CORS enablement for Watson Content Hub, go to Hub set up -> General settings -> Security tab. After adding your domain (or "*" for any domain), be sure to click the Save button at the top right of the screen.

#### 5. Install the Script App to DX

To upload the sample Script Application:
+ Install the [Script Application](https://www.ibm.com/support/knowledgecenter/en/SSDK36_8.5.0/script-portlet/cmd_line_push_ovr.html) command line `sp`, as described in the Script Application documentation.
+ Call `sp push` from the `/dx-script-application` folder to push the contents of that folder as a script application.

#### 6. Adding the Script App to a DX Page

+ With a page in edit mode, bring up the toolbar and find the page component called "WCH Handlebars Rendered Content Sample" and add it to the page.
+ Click on the button "Select content From Watson Content Hub" to configure the application, then click Save.
+ Take the page out of edit mode to see the content or search results displayed.
+ To bring up the configuration dialog to change the configuration, turn edit mode back on.

Note that the Handlebars library used for rendering can conflict with Dojo, so for example, the rendering won't work in Digital Experience when the page is in edit mode. Also note that most of the sample templates currently use Bootstrap styling, which may change some of the Portal theme styling.


## Previewing and testing templates locally with Express server

For previewing and testing the Handlebars templates, there is a simple Express server you can use that loads templates from the local `/dx-script-application/hbs-templates` folder.

To use this server:
1. Run `npm install` from the root project folder
2. Run `node main.js` to start the Express server


## Use of the Content Palette

By default, this sample uses the [IBM Watson Content Hub Palette](https://github.com/ibm-wch/sample-picker) in single content item mode. To switch to using a simple dropdown, change the `_usePicker` flag in `/dx-script-application/app.js` to `false`. Make sure to call `sp push` from the `/dx-script-application` folder to make these changes in DX.


## Creating your own Handlebars templates

This sample expects to find rendering template files in the `/dx-script-application/hbs-templates/` directory. The provided sample templates are for the "Sample Article" content type. You can add new Handlebars templates for your types to the directory, which is structured like this:

	/content/[content-type]/default.html
	/content/[content-type]/[other templates].html
	/list/[content-type]/default.html
	/list/[content-type]/[other templates].html

Note that the file extension for the templates is `html`. This is so they will be recognized by the script application.

Control which templates are available in the script application by editing the `_availableTemplates` JSON object in `/dx-script-application/app.js`. The structure of the object mirrors the hierarchy of the `/dx-script-application/hbs-templates/` directory, where templates are first separated by mode ("Single content item" or "Search results list"), then content type. Each of the two modes contain a list of content types with their own array of templates:

```
let _availableTemplates = {
	'content': [
		{
			'typeName': 'Sample Article',
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
			'typeName': 'Sample Article',
			'templates': [
				'default.html',
				'carousel.hhtmlbs',
				'image-with-text-above.hbhtmls',
				'image-with-text-below.html',
				'table-display.html',
				'text-with-popup-details.html'
			]
		}
	]
};
```

If a new content type, called "Product", is added, the JSON object may look like this:
```
let _availableTemplates = {
	'content': [
		{
			'typeName': 'Sample Article',
			'templates': [
				'default.html',
				'banner-text-on-left.html',
				'text-below.html',
				'text-overlaid.html',
				'title-and-summary.html'
			]
		},
		{
			'typeName': 'Product',
			'templates': [
				'card.html',
				'details.html'
			]
		}
	],
	'list': [
		{
			'typeName': 'Sample Article',
			'templates': [
				'default.html',
				'carousel.html',
				'image-with-text-above.html',
				'image-with-text-below.html',
				'table-display.html',
				'text-with-popup-details.html'
			]
		},
		{
			'typeName': 'Product',
			'templates': [
				'card-list.html'
			]
		}
	]
};
```

To update the default templates and content types shown in the configuration UI dialog, update the `_selectedContent` JSON object in `/dx-script-application/app.js`:
```
let _selectedContent = {
	template: {
		'content': 'default.html',
		'list': 'default.html'
	},
	contentType: {
		'content': 'Sample Article',
		'list': 'Sample Article'
	}
};
```

## Sample limitations
- Modern ES6 JavaScript code is not compatible with Internet Explorer. To run this sample in Internet Explorer, the use of the `class` keyword, and [arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) would need to be removed.
