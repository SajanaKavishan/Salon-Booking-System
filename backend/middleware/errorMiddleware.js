const { randomUUID } = require('node:crypto');

const PRODUCTION_SERVER_ERROR_PAYLOAD = Object.freeze({
  success: false,
  message: 'An internal server error occurred. Please try again later.',
  code: 'SERVER_ERROR',
});

const sanitizeCorrelationId = (value) => {
  const candidate = String(value || '').trim().slice(0, 128);
  return /^[a-zA-Z0-9._:-]+$/.test(candidate) ? candidate : '';
};

const attachCorrelationId = (req, res, next) => {
  const suppliedCorrelationId = sanitizeCorrelationId(req.get?.('x-correlation-id'));
  req.correlationId = suppliedCorrelationId || randomUUID();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
};

// Controllers that still terminate responses locally are covered by this final
// production boundary, so no accidental 500 payload can disclose internals.
const maskProductionServerErrors = (_req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const sendJson = res.json.bind(res);
  res.json = (payload) => sendJson(
    res.statusCode === 500 ? PRODUCTION_SERVER_ERROR_PAYLOAD : payload
  );
  next();
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = Number(err?.status || err?.statusCode) || 500;
  const correlationId = req.correlationId || randomUUID();
  const logRecord = {
    timestamp: new Date().toISOString(),
    correlationId,
    statusCode,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip || req.socket?.remoteAddress || null,
    userId: req.user?._id?.toString?.() || req.user?.id?.toString?.() || null,
    errorName: err?.name || 'Error',
    message: err?.message || 'Internal Server Error',
    stack: err?.stack || String(err),
  };

  console.error('[SERVER_ERROR]', logRecord);
  res.setHeader('X-Correlation-Id', correlationId);

  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    res.status(statusCode).json(PRODUCTION_SERVER_ERROR_PAYLOAD);
    return;
  }

  res.status(statusCode).json({
    success: false,
    message: err?.message || 'Internal Server Error',
    ...(err?.code ? { code: err.code } : {}),
    ...(process.env.NODE_ENV !== 'production' && err?.stack ? { stack: err.stack } : {}),
  });
};

module.exports = {
  PRODUCTION_SERVER_ERROR_PAYLOAD,
  attachCorrelationId,
  errorHandler,
  maskProductionServerErrors,
};
