
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

exports.job = function(req, res){
  res.render('job', { title: 'Express' });
};

exports.locate = function(req, res){
  res.render('about', { title: 'Express' });
};
