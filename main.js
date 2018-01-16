/*
 * Copyright IBM Corp. 2016, 2017
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

// Express server that serves static files for testing template rendering locally

var express = require('express');
var app = express();
var path = require('path');

// serves all the static files in the assets/sample-handlebars-render folder
app.use(express.static(path.join(__dirname, 'dx-script-application')));

app.listen(3003, function() {
	console.log('Listening on port 3003');
	console.log('Sample Express server for testing Handlebars templates locally at: http://localhost:3003/index.html');
});
