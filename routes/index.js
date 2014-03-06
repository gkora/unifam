
/*
 * GET home page.
 */

var CONFIG = require('config').System;
var uuid 	 = require('node-uuid');
var _ 		 = require('lodash');
var async  = require('async');
var mkdir  = require('mkdirp');
var path	 = require('path');
var mail 	 = require('nodemailer');
var fs 	 	 = require('fs-extra');

var Datastore = require('nedb')
  , db = new Datastore({ filename: path.join(__dirname, '../', CONFIG.Database.location), autoload: true });

var transport = mail.createTransport("SMTP", {
	host: CONFIG.SMTP.server,
	secureConnection: false,
	name: CONFIG.SMTP.name
});

exports.index = function(req, res){
  res.render('index');
};

exports.job = function(req, res){
  res.render('job');
};

exports.jobpost = function(req, res) {

	var newJob = {};

	newJob.id = uuid.v4();
	newJob.submitTime = new Date().getTime();
	newJob.jobDirectory = path.join(CONFIG.userDataLocation, newJob.id);

	newJob.statuses = [];
	newJob.statuses.push( { state: 'Online Request Submitted', time: new Date().getTime() } );
	_.extend(newJob, req.body);

	var fileDetails = _.clone(req.files);
	fileDetails.inputFile = _.omit(fileDetails.inputFile, 'ws');
	_.extend(newJob, fileDetails);

	newJob.request = {};
	newJob.request.UA = req.get('User-Agent');
	newJob.request.IP = req.ip;

	async.series([
			// Make directory for the job
			function(callback) {
				mkdir(newJob.jobDirectory, function (err) {
					if (err) {
						callback(err, null);
					} else {
						newJob.statuses.push( { state: 'Job Directory Created', time: new Date().getTime() } );
						callback(null, 'Directory Created');
					}
				});

			},
			
			// Move input file into the directory.
			function(callback) {
				fs.copy(newJob.inputFile.path, path.join(newJob.jobDirectory, newJob.inputFile.name), function (err) {
					if (err) {
						callback(err, null);
					} else {
						newJob.statuses.push( { state: 'Copied input file into job directory', time: new Date().getTime() } );
						callback(null, 'Copied input file into job directory');
					}
				});
			},
			
			// Send email to the user
			function(callback) {
				
				var body = _.template(CONFIG.SMTP.jobReceiveTemplate.content, { 'name': newJob.name, 'id': newJob.id});
				var mailOptions = {
					from: CONFIG.SMTP.from,
					to: newJob.email,
					subject: CONFIG.SMTP.jobReceiveTemplate.subject,
					/*text: ""*/
					html: body
				}
				transport.sendMail(mailOptions, function(err, response){
					if(err){
						callback(err, null);
					}else{
						newJob.statuses.push( { state: 'Email message sent to user', time: new Date().getTime() } );
						callback(null, "Message sent: " + response.message);
					}
				});

			},

			// Save the data to the db
			function(callback) {
				db.insert(newJob, function (err, newJob) {
					if(err){
						callback(err, null);
					}else{
						callback(null, 'New job saved to the DB');
					}
				});
			}
			], 
			function(error, results) {
				if (error) {
					res.render('submitted', { error: error, job: newJob});
				} else {
					res.render('submitted', { error: null, job: newJob});
				}
	
	});

};

exports.locate = function(req, res){
  res.render('locate'); 
};

exports.locatepost = function(req, res){
  res.render('locateStatus', {id: req.body.id}); 
};

exports.locateWithId = function(req, res){
  res.render('locateStatus', {id: req.params.id}); 
};
