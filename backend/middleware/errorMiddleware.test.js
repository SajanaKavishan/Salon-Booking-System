const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PRODUCTION_SERVER_ERROR_PAYLOAD,
  errorHandler,
  maskProductionServerErrors,
} = require('./errorMiddleware');

const createResponse = () => ({
  headers: {},
  headersSent: false,
  statusCode: 200,
  body: null,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(value) {
    this.statusCode = value;
    return this;
  },
  json(value) {
    this.body = value;
    return this;
  },
});

test('production response boundary masks locally handled HTTP 500 payloads', () => {
  const previousEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const response = createResponse();
    maskProductionServerErrors({}, response, () => {});
    response.status(500).json({ message: 'MongoServerError: secret details' });
    assert.deepEqual(response.body, PRODUCTION_SERVER_ERROR_PAYLOAD);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('global error handler masks production server errors and preserves development details', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  console.error = () => {};

  const request = {
    correlationId: 'test-correlation-id',
    method: 'GET',
    originalUrl: '/api/test',
    ip: '127.0.0.1',
  };
  const error = new Error('Sensitive database failure');

  try {
    process.env.NODE_ENV = 'production';
    const productionResponse = createResponse();
    errorHandler(error, request, productionResponse, () => {});
    assert.equal(productionResponse.statusCode, 500);
    assert.deepEqual(productionResponse.body, PRODUCTION_SERVER_ERROR_PAYLOAD);

    process.env.NODE_ENV = 'development';
    const developmentResponse = createResponse();
    errorHandler(error, request, developmentResponse, () => {});
    assert.equal(developmentResponse.body.message, 'Sensitive database failure');
    assert.match(developmentResponse.body.stack, /Sensitive database failure/);
  } finally {
    console.error = originalConsoleError;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});
