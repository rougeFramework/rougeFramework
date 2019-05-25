const express = require('express');

//DB
const low = require('lowdb');
const shortid = require('shortid');
const FileSync = require('lowdb/adapters/FileSync');
var appAdapter = new FileSync('./App/Data/appData.json');
var appDb = low(appAdapter);

var adapter = new FileSync('./App/Data/data.json');
var db = low(adapter);

//Tools
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

//rougeFramework Settings
const settings = require('./../rougeSettings.json');
//rougeFramework UI
const tableToForm = require('./formGenerator').tableToForm;
const cssProperties = require('./Ui/cssProperties');
//rougeFramework Back End
const crud = require('./crud.js').crud;
const utils = require('./utils.js');

//webpack
const webpack = require('webpack');
const config = require('../webpack.config.dev.js');
const compiler = webpack(config);
const webpackHotMiddleware = require('webpack-hot-middleware')(compiler);
const webpackDevMiddleware = require('webpack-dev-middleware')(compiler, config.devServer);

//Server Params
var port = 8080;
var app = express();
app.use(methodOverride('_method'));

//webpack
app.use(webpackDevMiddleware);
app.use(webpackHotMiddleware);

//Parser
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);

app.use((req, res, next) => {
	// -----------------------------------------------------------------------
	// authentication middleware

	const auth = { login: 'tumulte', password: 'TCHF2lml' }; // change this

	// parse login and password from headers
	const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
	const [login, password] = new Buffer(b64auth, 'base64').toString().split(':');

	// Verify login and password are set and correct
	if (login && password && login === auth.login && password === auth.password) {
		// Access granted...
		return next();
	}

	// Access denied...
	res.set('WWW-Authenticate', 'Basic realm="401"'); // change this
	res.status(401).send('Authentication required.'); // custom message

	// -----------------------------------------------------------------------
});
//API
var api = crud(db);
app.use('/api', api);

//Template Engine
app.set('view engine', 'pug');

//Static Files
app.use(express.static('static'));
app.use(express.static('node_modules/normalize.css'));
app.use(express.static('App/Dist'));
app.use('/images', express.static('App/Static/images'));
//Per apps Static Files
for (var application in settings.applications) {
	app.use(
		'/' + settings.applications[application] + '/static',
		express.static('app/' + settings.applications[application] + '/static')
	);
}

//Global template settings
var currentApplicationSettings = settings.applications[settings.defaultApp];
currentApplicationSettings.applicationName = settings.defaultApp;

//TODO generate a default styleset with any app
if (currentApplicationSettings.styleSet !== '') {
	var styleSetCollection = appDb.get(currentApplicationSettings.applicationName).value();
	var styleCollection = appDb
		.get(currentApplicationSettings.applicationName)
		.find({ id: currentApplicationSettings.styleSet })
		.value();
	var storedColorSet = appDb
		.get('colorSetPresets')
		.find({ id: styleCollection.colorCombinationId })
		.value();
}

app.use('/:app', function(req, res, next) {
	if (req.params.app in settings.applications) {
		currentApplicationSettings = settings.applications[req.params.app];
		currentApplicationSettings.applicationName = req.params.app;
	} else if (req.params.app !== 'admin') {
		res.status(404).send('This page does not exist');
	}
	next();
});
app.use(function(req, res, next) {
	res.locals.cssProperties = cssProperties.render(styleCollection, storedColorSet);
	res.locals.title = currentApplicationSettings.title;
	res.locals.language = currentApplicationSettings.language;
	res.locals.styleSetName = '';

	res.locals.styleCollection = JSON.stringify(styleCollection);
	res.locals.storedColorSet = JSON.stringify(storedColorSet);

	res.locals.styleSetCollection = JSON.stringify(utils.idAsKey(styleSetCollection));
	res.locals.styleSetName = styleCollection.styleSet;
	res.locals.styleSetId = currentApplicationSettings.styleSet;
	res.locals.colorSetCollection = JSON.stringify(appDb.get('colorSetPresets').value());
	next();
});

//Pages
app.get('/', function(req, res) {
	app.set('views', __dirname + '/../app' + settings.defaultApp + '/views');
	res.render('index');
});

//cssPanel
app.get('/:app', function(req, res) {
	app.set('views', __dirname + '/../app' + req.params.app + '/views');
	res.render('index');
});

app.use('/edit/:app/:table/:id', function(req, res, next) {
	var data = db
		.get(req.params.app + '_' + req.params.table)
		.find({
			id: req.params.id,
		})
		.value();
	req.params.method = 'put';
	var form = tableToForm(req.params, data);
	req.form = form;

	next();
});
app.use('/add/:app/:table/', function(req, res, next) {
	req.params.method = 'post';
	var form = tableToForm(req.params);
	req.form = form;

	next();
});
app.get('/edit/:app/:table/:id', function(req, res) {
	app.set('views', './app' + req.params.app + '/views');
	res.render('edit', {
		form: req.form,
	});
});
app.get('/add/:app/:table', function(req, res) {
	app.set('views', './app' + req.params.app + '/views');
	res.render('add', {
		form: req.form,
	});
});

//TODO add setup. Check initiateApp.js
app.get('/admin/setup', function() {
	appDb.set(currentApplicationSettings.applicationName, []).write();
});

//TODO add put
app.post('/admin/settings/:type', function(req, res) {
	if (req.body.styleSet === '') {
		req.body.styleSet = 'styleSet-' + req.body.id;
	}
	if (req.params.type === 'overwrite') {
		appDb
			.get(currentApplicationSettings.applicationName)
			.find({ id: req.body.id })
			.assign(req.body)
			.write();
	} else {
		req.body.id = shortid.generate();

		appDb
			.get(currentApplicationSettings.applicationName)
			.push(req.body)
			.write();
	}

	res.send('settings for ' + currentApplicationSettings.applicationName + ' saved');
});

//Server
/* eslint-disable no-console */
app.listen(port, function(err) {
	if (err) {
		console.log(err);
	} else {
		console.log('connected to port : ' + port);
	}
});

app.on('listening', function() {});