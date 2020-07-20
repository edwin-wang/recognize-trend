var express = require('express');
var router = express.Router();

// import multer and the AvatarStorage engine
var fs = require("fs");
var _ = require('lodash');
var path = require('path');
var multer = require('multer');
var { exec } = require("child_process");
var AvatarStorage = require('../helpers/AvatarStorage');

var cvtApp = 'bin/convert.py';
var ocrText;
var jsonKey = [];

// setup a new instance of the AvatarStorage engine 
var storage = AvatarStorage({
	square: false,
	responsive: true,
	greyscale: true,
	quality: 100,
	threshold: 800
});

var limits = {
	files: 1,
};

var fileFilter = function(req, file, cb) {
	// supported image file mimetypes
	var allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif'];

	if (_.includes(allowedMimes, file.mimetype)) {
		// allow supported image files
		cb(null, true);
	} else {
		// throw error for invalid files
		cb(new Error('Invalid file type. Only jpg, png and gif image files are allowed.'));
	}
};

// setup multer
var upload = multer({
	storage: storage,
	limits: limits,
	fileFilter: fileFilter
});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Upload Image', avatar_field: process.env.AVATAR_FIELD });
});

router.post('/upload', upload.single(process.env.AVATAR_FIELD), function(req, res, next) {

	var files;
	var file = req.file.filename;
	var filepath = req.file.destination + '/' + req.file.filename;
	var matches = file.match(/^(.+?)_.+?\.(.+)$/i);

	if (matches) {
		files = _.map(['lg'], function(size) {
			return matches[1] + '_' + size + '.' + matches[2];
		});
	} else {
		files = [file];
	}

	files = _.map(files, function(file) {
		var port = req.app.get('port');
		var base = req.protocol + '://' + req.hostname + (port ? ':' + port : '');
		var url = path.join(req.file.baseUrl, file).replace(/[\\\/]+/g, '/').replace(/^[\/]+/g, '');

		return (req.file.storage == 'local' ? base : '') + '/' + url;
	});

	exec('python3 ' + cvtApp + ' -i ' + filepath + ' -p blur', (error, stdout, stderr) => {
		if (error) {
			console.log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}
		ocrText = stdout;

		res.redirect('/confirm');
	});
});

router.get('/confirm', function(req, res, next) {
	var json = JSON.parse(fs.readFileSync('wot.json'));
	var ocrArray = ocrText.split('\n');
	// offsite of value of the key
	var v2u = [16, 17, 17, 16];
	var picked = ocrArray.indexOf(json.ThyCa[0]);

	for (x in json.ThyCa) {
		jsonKey.push({
			key: json.ThyCa[x],
			value: ocrArray[ocrArray.indexOf(json.ThyCa[x]) + v2u[x]]
		});
	}

	var item = "";
	var value = "";
	for (i = 0; i < jsonKey.length; i++) {
		item = item + jsonKey[i].key + "\r";
		value = value + jsonKey[i].value + "\r";
	}
	res.render('confirm', { ocr: ocrText, item: item, value: value });
});

router.post('/result', function(req, res, next) {
	// define the previous values
	var date = ['2019-12-20', '2020-02-25', '2020-03-09'];
	var data = [96.3, 1.57, 1.61];

	date.push('2020-05-11');
	for (x in jsonKey) {
		if (jsonKey[x]['key'] == '甲状腺球蛋白') {
			data.push(jsonKey[x]['value']);
			break;
		}
	}

	const { CanvasRenderService } = require('chartjs-node-canvas');

	const width = 1000;
	const height = 800;
	const chartCallback = (ChartJS) => {
		ChartJS.defaults.global.elements.rectangle.borderWidth = 2;
		ChartJS.plugins.register({ });
		ChartJS.controllers.MyType = ChartJS.DatasetController.extend({ });
	};
	const canvasRenderService = new CanvasRenderService(width, height, chartCallback);

	(async () => {
		const configuration = {
			type: 'line',
			data: {
				labels: date,
				datasets: [{
					label: 'Trading',
					data: data,
					backgroundColor: [
						'rgba(255, 99, 132, 0.2)',
						'rgba(54, 162, 235, 0.2)',
						'rgba(255, 206, 86, 0.2)',
						'rgba(75, 192, 192, 0.2)'
					],
					borderColor: [
						'rgba(255,99,132,1)',
						'rgba(54, 162, 235, 1)',
						'rgba(255, 206, 86, 1)',
						'rgba(75, 192, 192, 1)'
					],
					borderWidth: 2
				}]
			},
			options: {
				scales: {
					yAxes: [{
						ticks: {
							beginAtZero: true,
							callback: (value) => value
						}
					}]
				}
			}
		};
		const image = await canvasRenderService.renderToBuffer(configuration);
		res.end(image);
	})();
});

module.exports = router;
