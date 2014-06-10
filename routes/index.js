
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
var ini    = require('ini');
var spawn  = require('child_process').execFile;
var executionOutput = 'executionOutput.log';
var executionError = 'executionError.log';


var Datastore = require('nedb')
  , db = new Datastore({ filename: path.join(__dirname, '../', CONFIG.Database.location), autoload: true });

var transport = mail.createTransport("SMTP", {
	host: CONFIG.SMTP.server,
	secureConnection: false,
	name: CONFIG.SMTP.name
});

// Search related files 
var execTemplateFile = path.join(__dirname, '../', 'bin', 'execTemplate.sh');
var execFile = 'exec.sh';




exports.index = function(req, res){
  res.render('index');
};

exports.job = function(req, res){
  res.render('job');
};

exports.jobpost = function(req, res) {

	console.dir(req.body);

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

      // Create a properties file
      function(callback) {

        var configFile = CONFIG.configuration.configFileName;

				var config = {};

				//[prodigal]
				config.prodigal= {};
				config.prodigal.prodigalPath = CONFIG.configuration.prodigalPath;
				config.prodigal.runOffEdge = 'True'
				config.prodigal.maskNs = 'False'
				config.prodigal.quiet = 'False'

				if (req.body.jobType === 'single' ) {
					config.prodigal.procedure = 'single';
				} else {
					config.prodigal.procedure = 'meta';
				}

				//config.prodigal.translationTable = req.body.translationTable;

				//[RNAmmer]
				config.RNAmmer= {};
				config.RNAmmer.tRNAscanPath = CONFIG.configuration.RNAmmerPath;

				//[tRNAscan]
				config.tRNAscan= {};
				config.tRNAscan.tRNAscanPath = CONFIG.configuration.tRNAscanPath;

				//[hmmsearch]
				config.hmmsearch= {};
				config.hmmsearch.output = CONFIG.configuration.output;
				config.hmmsearch.hmmsearchPath = CONFIG.configuration.hmmsearchPath;
				config.hmmsearch.cpu = CONFIG.configuration.cpu;
				config.hmmsearch.eval = req.body.hmmEval;

				//[PathoLogic]
				config.PathoLogic= {};
				config.PathoLogic.PathoLogicPath = CONFIG.configuration.PathoLogicPath;
				config.PathoLogic.PathwayLocalDir = CONFIG.configuration.PathwayLocalDir;
				config.PathoLogic.organism = req.body.orgName;
				config.PathoLogic.domain = req.body.pdomain;
				config.PathoLogic.taxID = req.body.taxId;

				//[UniFam]
				config.UniFam= {};
				config.UniFam.dataDir = CONFIG.configuration.dataDir;
				config.UniFam.doParse = 'True';
				config.UniFam.dohmmsearch = 'True';
				if ( req.body.jobType === 'single' || req.body.jobType === 'meta' || req.body.jobType === 'pp' ) {
					config.UniFam.database = 'prok';
				} else if ( req.body.jobType === 'ep' ){
					config.UniFam.database = 'euk';
				} else {
					config.UniFam.database = 'all';
				}

				if ( req.body.jobType === 'single' || req.body.jobType === 'meta' ) {
					config.UniFam.inputFormat = 'contigs';
					config.UniFam.doProdigal = 'True';
				} else {
					config.UniFam.inputFormat = 'proteins';
					config.UniFam.doProdigal = 'False';
				}

				if ( req.body.jobType === 'single' ) {
					config.UniFam.doPathway = 'True';
					config.UniFam.doRNAmmer = 'True';
					config.UniFam.dotRNAscan = 'True';
				} else {
					config.UniFam.doPathway = 'False';
					config.UniFam.doRNAmmer = 'False';
					config.UniFam.dotRNAscan = 'False';
				}

				config.UniFam.workDir = newJob.jobDirectory;
				config.UniFam.tmpDir = newJob.jobDirectory;
				config.UniFam.name = req.body.projectName;
				config.UniFam.seqCoverage = req.body.seqCoverage;
				config.UniFam.hmmCoverage = req.body.hmmCoverage;

				fs.writeFile(
						path.join(newJob.jobDirectory, configFile ),
						ini.stringify(config),
						function(err) {


					if (err) {
						callback(err, null);
					} else {
						newJob.statuses.push( { state: 'Job configuration file created', time: new Date().getTime() } );
						callback(null, 'Job configuration file created');
					}
				});

      },

			// Create and copy exec file.
			function( callback) {

				console.dir(newJob);

				// Get the template
				var execTemplate =  _.template(fs.readFileSync(execTemplateFile));

				console.log(execTemplate);

				//Compile the text
				var execFileContents = execTemplate( {
					name: req.body.projectName
					, pbsQ: CONFIG.configuration.pbsQ
					, cpu: CONFIG.configuration.cpu
					, workdir: newJob.jobDirectory
					, sourceLocation: CONFIG.configuration.sourceLocation
					, inputFileName:  path.join(newJob.jobDirectory, newJob.inputFile.name)
					, id: newJob.id
					, server: CONFIG.configuration.server
				});

				// Write to the file.
			  var execFilePath = path.join(newJob.jobDirectory, execFile);
				fs.writeFileSync(execFilePath, execFileContents);

				// Make it executable
				fs.chmodSync(path.join( newJob.jobDirectory, execFile), '755');

				callback(null, 'ok');

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
			},
			function(callback) {
				var outFile = fs.openSync(path.join(newJob.jobDirectory, executionOutput), 'a');
				var errFile = fs.openSync(path.join(newJob.jobDetails.jobDirectory, executionError), 'a');

				var startTime = Date.now();


				var exec = spawn( searchExecPath,null,
						{
							cwd: newJob.jobDirectory
					,detached: true
					,stdio: [ 'ignore', outFile, errFile]
						});

				callback( null, exec.pid);

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

exports.downloads = function(req, res){
  res.render('downloads'); 
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
