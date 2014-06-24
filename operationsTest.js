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
      on: stub(),
      get: stub(),
      put: stub(),
      list: stub(),
      destroy: stub(),
      setDebugMode: stub(),

      raw: {
        dele: stub(),
        quit: stub()
      },

      socket: {
        writable: true
      }
    });
    operationsFromInit = operations.init();
  });

  var calledOnceWith = function(_stub /*arg1, arg2,...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    expect(_stub.calledOnce).to.be.true;
    expect(_stub.calledWith.apply(_stub, args)).to.be.true;
  };

  it('should set the options, JSFtp from instantiation', function() {
    operations = new Operations({
      username: username,
      password: password
    });

    expect(operations.username).to.equal(username);
    expect(operations.password).to.equal(password);
    expect(operations.port).to.equal(21);
    expect(operations.host).to.equal('localhost');
    expect(operations.FtpOperations).to.deep.equal(FtpOperations);
    expect(operations.protocol).to.equal('http');

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

    expect(operations.protocol).to.equal('ftp');
  });

  it('should throw an error when an unsupported protocol is used', function() {
    expect(function() {
      operations = new Operations({
        username: username,
        password: password,
        protocol: 'T.120'
      });
    }).to.throw('Error: The T.120 protocol is not supported.');
  });


  describe('init', function() {
    it('should return the main object', function() {
      expect(operationsFromInit).to.deep.equal(operations);
    });

    it('should initialize the ftp mode', function() {
      calledOnceWith(operations.ftpOperations.init, {
        host: operations.host,
        port: operations.port,
        username: operations.username,
        password: operations.password
      });
    });
  });

  describe('upload', function() {
    it('should call the ftp upload with the sent in args', function() {
      operations.ftpOperations.upload = stub();
      var callback = stub();

      operations.upload('test.csv', true, callback);

      calledOnceWith(operations.ftpOperations.upload, operations.username,'test.csv',true,callback);
    });
  });

  describe('download', function() {
    it('should call the ftp download with the sent in args', function() {
      operations.ftpOperations.download = stub();
      var callback = stub();

      operations.download('/complete', false, callback);

      var poll = operations.POLL_EVERY;
      calledOnceWith(operations.ftpOperations.download, '/complete', poll, false, callback);
    });
  });

  describe('remove', function() {
    it('should call the ftp remove with the sent in callback', function() {
      operations.ftpOperations.remove = stub();
      var callback = stub();

      operations.remove(callback);

      calledOnceWith(operations.ftpOperations.remove, callback);
    });
  });

  describe('quit', function() {
    it('should call the ftp quit with the sent in callback', function() {
      operations.ftpOperations.quit = stub();
      var callback = stub();

      operations.quit(callback);

      calledOnceWith(operations.ftpOperations.quit, callback);
    });
  });
});