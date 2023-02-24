// overwrite console logging methods for test duration
global.console = {
  log: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}
