exports.get404 = (req, res, next) => {
  res.status(404).render('errors/404', { 
    pageTitle: 'Page Not Found',
     path: '/404'});
};

exports.get500 = (req, res, next) => {
  res.status(500).render('errors/500', { 
    pageTitle: 'Database Failed',
     path: '/500'});
};

exports.dbErrorCatcher = (err, next) => {
  const error = new Error(err);
  error.httpStatus = 500;
  return next(error);
}