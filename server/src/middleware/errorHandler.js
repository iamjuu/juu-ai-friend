function notFound(_req, res) {
  res.status(404).json({
    error: 'not_found',
    message: 'ഈ റൂട്ട് കണ്ടെത്തിയില്ല.',
  });
}

function errorHandler(err, _req, res, _next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'file_too_large',
      message: 'ഓഡിയോ ഫയൽ വളരെ വലുതാണ്. 10 MB വരെയേ അപ്‌ലോഡ് ചെയ്യാവൂ.',
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'invalid_id',
      message: 'അസാധുവായ ഐഡി.',
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'upload_error',
      message: err.message || 'ഓഡിയോ അപ്‌ലോഡ് പരാജയപ്പെട്ടു.',
    });
  }

  const status = err.status || err.statusCode || 500;
  const payload = {
    error: err.code || 'server_error',
    message: err.publicMessage || err.message || 'സെർവറിൽ ഒരു പിശക് സംഭവിച്ചു.',
  };

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json(payload);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { notFound, errorHandler, asyncHandler };
