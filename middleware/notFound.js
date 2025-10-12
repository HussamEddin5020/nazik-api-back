const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `المسار ${req.originalUrl} غير موجود`,
    path: req.originalUrl,
    method: req.method
  });
};

module.exports = notFound;


