/**
 * Tests all functions in operations.js.
 * NOTE: mocha needs to be installed as global: npm install -g mocha
 **/
var sinon = require('sinon'),
    stub = sinon.stub,
    chai = require('chai'),
    expect = chai.expect;

var Operations = require('./operations'),
    FtpOperations = require('./ftpOperations');

describe('Operations', function() {
  var operations, username, password, port, host, operationsFromInit;
  beforeEach(function() {
    username = 'TestKey';
    password = 'e261742d-fe2f-4569-95e6-312689d04903';
    port = 9871;
    host = 'localhost';

    operations = new Operations({
      username: username,
      password: password
    });

    stub(operations, 'FtpOperations').returns({
      init: stub(),
      upload: stub(),
      download: stub(),
      remove: stub(),
      quit: stub()
    });
    stub(operations, 'HttpOperations').returns({
      init: stub()
    });
    operationsFromInit = operations.init();
  });

  var calledOnceWith = function(_stub /*arg1, arg2,...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    expect(_stub.calledOnce).to.be.true;
    expect(_stub.calledWith.apply(_stub, args)).to.be.true;
  };

  var ftpModeInit = function() {
    operations.setProtocol('ftp');
    operationsFromInit = operations.init();
  }

  it('should set the options, JSFtp from instantiation', function() {
    operations = new Operations({
      username: username,
      password: password,
      port: 80
    });

    expect(operations.username).to.equal(username);
    expect(operations.password).to.equal(password);
    expect(operations.port).to.equal(80);
    expect(operations.host).to.equal('localhost');
    expect(operations.FtpOperations).to.deep.equal(FtpOperations);
    expect(operations.getProtocol()).to.equal('http');

    expect(operations.uploadFileName).to.be.null;
  });

  it('should set a custom host and port when specified', function() {
    operations = new Operations({
      port: port,
      host: host
    });

    expect(operations.port).to.equal(port);
    expect(operations.host).to.equal(host);
  });

  it('should set POLL_EVERY to 300000 by default and the number of ms when custom', function() {
    expect(operations.POLL_EVERY).to.equal(300000);
    
    operations = new Operations({
      username: username,
      password: password,
      polling: 2
    });

    expect(operations.POLL_EVERY).to.equal(2000);
  });

  it('should set the protocol to ftp when it is specified', function() {
    operations = new Operations({
      username: username,
      password: password,
      protocol: 'ftp'
    });

    expect(operations.getProtocol()).to.equal('ftp');
  });

  describe('init', function() {
    it('should return the main object', function() {
      expect(operationsFromInit).to.deep.equal(operations);
    });

    it('should initialize the ftp operations when in FTP mode', function() {
      ftpModeInit();

      calledOnceWith(operations.ftpOperations.init, {
        host: operations.host,
        port: operations.port,
        username: operations.username,
        password: operations.password
      });
    });

    it('should initialize the http operations when in FTP mode', function() {
      calledOnceWith(operations.httpOperations.init, {
        host: operations.host,
        port: operations.port,
        username: operations.username,
        password: operations.password
      });
    });
  });

  describe('upload', function() {
    it('should call the ftp upload with the sent in args and user when in ftp mode', function() {
      ftpModeInit();
      operations.ftpOperations.upload = stub();
      var callback = stub();

      operations.upload('test.csv', true, callback);

      calledOnceWith(operations.ftpOperations.upload, operations.username,'test.csv',true,callback);
    });

    it('should call the http upload with the sent in args when in http mode', function() {
      operations.httpOperations.upload = stub();
      var callback = stub();

      operations.upload('test.csv', true, callback);

      calledOnceWith(operations.httpOperations.upload, 'test.csv', true, callback);
    });
  });

  describe('download', function() {
    var callback, poll;
    beforeEach(function() {
      callback = stub();
      poll = operations.POLL_EVERY;
    });

    it('should call the ftp download with the sent in args', function() {
      ftpModeInit();
      operations.ftpOperations.download = stub();

      operations.download('/complete', false, callback);

      calledOnceWith(operations.ftpOperations.download, '/complete', poll, false, callback);
    });

    it('should call the http download with the sent in args', function() {
      operations.httpOperations.download = stub();

      operations.download('/complete', false, callback);

      calledOnceWith(operations.httpOperations.download, '/complete', poll, false, callback);
    });
  });

  describe('remove', function() {
    it('should call the ftp remove with the sent in callback', function() {
      ftpModeInit();
      operations.ftpOperations.remove = stub();
      var callback = stub();

      operations.remove(callback);

      calledOnceWith(operations.ftpOperations.remove, callback);
    });
  });

  describe('quit', function() {
    it('should call the ftp quit with the sent in callback', function() {
      ftpModeInit();
      operations.ftpOperations.quit = stub();
      var callback = stub();

      operations.quit(callback);

      calledOnceWith(operations.ftpOperations.quit, callback);
    });

    it('should send back an unsupported error for the http protocol', function() {
      var callback = stub();

      operations.quit(callback);

      calledOnceWith(callback, 'The http protocol does not support quit.');
    });
  });

  describe('setProtocol', function() {
      it('should throw an error when an unsupported protocol is used', function() {
        expect(function() {
          operations.setProtocol('T.120');
        }).to.throw('Error: The T.120 protocol is not supported.');
      });
  });
});