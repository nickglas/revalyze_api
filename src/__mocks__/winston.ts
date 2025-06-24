// src/__mocks__/winston.ts
const logMock = jest.fn();

module.exports = {
  createLogger: jest.fn(() => ({
    info: logMock,
    error: logMock,
    debug: logMock,
    warn: logMock,
    log: logMock,
  })),
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
  },
};
