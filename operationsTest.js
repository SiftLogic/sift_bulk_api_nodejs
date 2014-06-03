/**
 * Tests all functions in operations.js.
 * NOTE: mocha needs to be installed as global: npm install -g mocha
 **/
var sinon = require('sinon'),
    stub = sinon.stub,
    chai = require('chai'),
    expect = chai.expect;

var Operations = require('./operations'),
    JSFtp = require('jsftp');

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

    stub(operations, 'JSFtp').returns({
      on: stub(),
      get: stub(),
      put: stub(),
      list: stub(),
      destroy: stub(),
      setDebugMode: stub(),

      raw: {
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
    expect(operations.JSFtp).to.deep.equal(JSFtp);

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

  describe('init', function() {
    beforeEach(function() {
      stub(console, 'log');
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should return the main object', function() {
      expect(operationsFromInit).to.deep.equal(operations);
    });

    it('should set the opts and set debugMode to true', function() {
      calledOnceWith(operations.JSFtp, {
        host: operations.host,
        port: operations.port,
        user: operations.username,
        pass: operations.password,
        debugMode: true
      });
    });
  });

  describe('toDownloadFormat', function() {
    it('should do no reformatting when the file type is not .txt or .csv and there is no source_',
    function() {
      expect(operations.toDownloadFormat()).to.equal();
      expect(operations.toDownloadFormat('')).to.equal('');
      expect(operations.toDownloadFormat('test_test.doc')).to.equal('test_test.doc');
    });

    it('should replace just source_ with archive_', function() {
      expect(operations.toDownloadFormat('source_test.doc')).to.equal('archive_test.doc');
    });

    it('should replace just the first source_ and just the last .csv with .zip', function() {
      expect(operations.toDownloadFormat('source_source_test.csv.csv')).to
       .equal('archive_source_test.csv.zip');
    });

    it('should replace just the first source_ and just the last .txt with .zip', function() {
      expect(operations.toDownloadFormat('source_source_test.txt.txt')).to
       .equal('archive_source_test.txt.zip');
    });

    it('should deal with a .csv followed by a .txt', function() {
      expect(operations.toDownloadFormat('source_source_test.csv.txt')).to
       .equal('archive_source_test.csv.zip');
    });
  });

  describe('upload', function() {
    var callback;
    beforeEach(function() {
      operations.init();
      callback = stub();
    });

    it('should call put with the file name and destination directory with multifile', function() { 
      var filename = 'test.csv';

      operations.upload(filename, null, callback);

      var serverLocation = '/import_' + operations.username + '_splitfile_config/' + filename;
      calledOnceWith(operations.ftp.put, filename, serverLocation);
    });

    it('should call put with the file name and destination directory with singlefile', function() { 
      var filename = 'test.csv';

      operations.upload(filename, true, callback);

      var serverLocation = '/import_' + operations.username + '_default_config/' + filename;
      calledOnceWith(operations.ftp.put, filename, serverLocation);
    });

    it('should call the callback when put fails', function() { 
      var filename = 'test.csv';

      operations.upload(filename, true, callback);
      operations.ftp.put.args[0][2]('An error');

      calledOnceWith(callback, 'An error');
    });

    it('should watch jsftp_debug calling the callback only upon getting a file upload message and '+
       'set the uploadFileName',
    function() {
      operations.upload('', null, callback);

      calledOnceWith(operations.ftp.on, 'jsftp_debug');

      operations.ftp.on.args[0][1]('test', {code: 225});

      expect(callback.calledOnce).to.be.false;

      operations.ftp.on.args[0][1]('response', {code: 225});

      expect(callback.calledOnce).to.be.false;

      var file = 'source_sample_subscriber_data_20140519_0004.csv';
      operations.ftp.on.args[0][1]('response', {
        code: 226,
        text: '226 closing data connection; File upload success; ' + file
      });

      expect(callback.calledOnce).to.be.true;
      expect(operations.uploadFileName).to.equal(file);
      expect(operations.ftp.events + '').to.equal('function (){}');// V8 only test
    });

    it('should call the callback with the error text when the code 550', function() {
      operations.upload('', null, callback);

      var text = '550 Insufficient credits (Upload ID: 5c835271b08622f30a125a421c8da0bf)';
      operations.ftp.on.args[0][1]('response', {
        code: 550,
        text: text
      });

      calledOnceWith(callback, text);
    });
  });

  describe('watchUpload', function() {
    var filename, callback;
    beforeEach(function() {
      callback = stub();
      stub(operations, 'reConnect');
      stub(console, 'log');

      filename = 'test1.csv';
      stub(operations, 'toDownloadFormat').returns(filename);

      operations.uploadFileName = null;
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should set debugMode to false', function() {
      operations.watchUpload(callback);

      calledOnceWith(operations.ftp.setDebugMode, false);
    });

    it('should list the complete directory', function() {
      operations.watchUpload(callback);

      calledOnceWith(operations.ftp.list, '/complete');
    });

    describe('list callback', function() {
      it('should print that the data is formatted when the expected file is found and calls ' +
         'the callback and not reConnect', function() {
        operations.uploadFileName = filename;
        operations.watchUpload(callback);

        operations.ftp.list.args[0][1](false, 'test0.csv\n' + filename + 'test2.csv');

        calledOnceWith(console.log, filename, 'found.');
        calledOnceWith(callback);

        expect(operations.reConnect.called).to.be.false;
      });

      it('should call the callback and does not reconnect', function() {
        var error = 'ERROR: AUTHENTICATION ERROR';

        operations.watchUpload(callback);

        operations.ftp.list.args[0][1](error);

        calledOnceWith(callback, error);
        expect(operations.reConnect.called).to.be.false;
      });

      it('should print a not found message and then recalls watchUpload in some amount of time ' +
         'and reconnects', function() {
        var clock = sinon.useFakeTimers();

        operations.watchUpload(callback);

        operations.ftp.list.args[0][1](false, 'test0.csv\ntest2.csv');
        calledOnceWith(console.log, 'Waiting for results file', filename, '...');

        stub(operations, 'watchUpload');

        clock.timeouts[1].func();

        calledOnceWith(operations.watchUpload, callback);
        expect(operations.reConnect.calledOnce).to.be.true;
      });
    });

    it('should call reconnect when the socket is not writable', function() {
      operations.ftp.socket.writable = false;

      operations.watchUpload(callback);

      expect(operations.reConnect.calledOnce).to.be.true;
    });
  });

  describe('reConnect', function() {
    it('should call destroy', function() {
      operations.reConnect();

      expect(operations.ftp.destroy.calledOnce).to.be.true;
    });

    it('should instantiate a new jsftp object with no debug mode', function() {
      operations.reConnect();

      expect(operations.JSFtp.calledTwice).to.be.true;
      expect(operations.JSFtp.calledWith({
        host: operations.host,
        port: operations.port,
        user: operations.username,
        pass: operations.password
      })).to.be.true;
    });
  });

  describe('download', function() {
    var callback;
    beforeEach(function() {
      callback = stub();
      stub(operations, 'watchUpload');
    });

    it('should call watchUpload with a function that calls the callback on error', function() { 
      operations.download('', callback);

      expect(operations.watchUpload.calledOnce).to.be.true;
      operations.watchUpload.args[0][0]('An Error');

      calledOnceWith(callback, 'An Error');
    });

    it('should call watchUpload with a function that call ftp get with the file name, destination '+
       'directory and callback', function() {
      var location = 'test/';
      stub(operations, 'toDownloadFormat').returns('test/test.zip');

      operations.download(location, callback);

      operations.watchUpload.args[0][0]();

      calledOnceWith(operations.ftp.get, '/complete/test/test.zip', 'test/test.zip', callback);
    });
  });

  describe('quit', function() {
    it('should call ftp raw\'s quit with the sent in callback', function() {
      var callback = stub();

      operations.quit(callback);

      calledOnceWith(operations.ftp.raw.quit, callback);
    });
  })
});