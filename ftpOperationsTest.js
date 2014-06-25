/**
 * Tests all functions in ftpOperations.js.
 * NOTE: mocha needs to be installed as global: npm install -g mocha
 **/

var sinon = require('sinon'),
    stub = sinon.stub,
    chai = require('chai'),
    expect = chai.expect;

var FtpOperations = require('./ftpOperations'),
    JSFtp = require('jsftp');

describe('FtpOperations', function() {
  var ftpOperations, username, password, port, host;
  beforeEach(function() {
    username = 'TestKey';
    password = 'e261742d-fe2f-4569-95e6-312689d04903';
    port = 9871;
    host = 'localhost';

    ftpOperations = new FtpOperations();

    stub(ftpOperations, 'JSFtp').returns({
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

    genericInit();
  });

  // Repeated from ftpOperations, but there is no point in a sharing file for just one function
  var calledOnceWith = function(_stub /*arg1, arg2,...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    expect(_stub.calledOnce).to.be.true;
    expect(_stub.calledWith.apply(_stub, args)).to.be.true;
  };

  var genericInit = function() {
    return ftpOperations.init({
      username: username,
      password: password,
      host: host,
      port: port
    });
  };

  it('should set the connection options from instantiation', function() {
    ftpOperations = new FtpOperations();

    expect(ftpOperations.ftp).to.equal(null);
    expect(ftpOperations.uploadFileName).to.equal(null);
  });

  describe('init', function() {
    it('should set the connection options and set a cache', function() {
      calledOnceWith(ftpOperations.JSFtp, {
        host: host,
        port: port,
        user: username,
        pass: password,
        debugMode: true
      });

      ftpOperations.init();

      expect(ftpOperations.JSFtp.args[1][0]).to.deep.equal({
        host: host,
        port: port,
        user: username,
        pass: password,
        debugMode: true
      });
    });

    it('should set the port to 21 when it is not specified', function() {
      ftpOperations.init({
        username: username,
        password: password,
        host: host
      });

      expect(ftpOperations.JSFtp.args[1][0].port).to.equal(21);
    });

    it('should return the newly created ftp object', function() {
      expect(genericInit()).to.deep.equal(ftpOperations.ftp);
    });
  });

  describe('toDownloadFormat', function() {
    it('should do no reformatting when the file type is not .txt or .csv and there is no source_',
    function() {
      expect(ftpOperations.toDownloadFormat()).to.equal();
      expect(ftpOperations.toDownloadFormat('')).to.equal('');
      expect(ftpOperations.toDownloadFormat('test_test.doc')).to.equal('test_test.doc');
    });

    it('should replace just source_ with archive_', function() {
      expect(ftpOperations.toDownloadFormat('source_test.doc')).to.equal('archive_test.doc');
    });

    it('should replace just the first source_ and just the last .csv with .zip', function() {
      expect(ftpOperations.toDownloadFormat('source_source_test.csv.csv')).to
       .equal('archive_source_test.csv.zip');
    });

    it('should replace just the first source_ and just the last .txt with .zip', function() {
      expect(ftpOperations.toDownloadFormat('source_source_test.txt.txt')).to
       .equal('archive_source_test.txt.zip');
    });

    it('should deal with a .csv followed by a .txt', function() {
      expect(ftpOperations.toDownloadFormat('source_source_test.csv.txt')).to
       .equal('archive_source_test.csv.zip');
    });
  });

  describe('reConnect', function() {
    beforeEach(function() {
      stub(ftpOperations, 'init');
    })

    it('should call destroy', function() {
      ftpOperations.reConnect();

      expect(ftpOperations.ftp.destroy.calledOnce).to.be.true;
    });

    it('should set init with the passed in options and debug mode to false', function() {
      ftpOperations.reConnect();

      calledOnceWith(ftpOperations.init);
      calledOnceWith(ftpOperations.ftp.setDebugMode, false);
    });

    it('should return the ftp object', function() {
      expect(ftpOperations.reConnect({})).to.deep.equal(ftpOperations.ftp);
    });
  });

  describe('upload', function() {
    var callback;
    beforeEach(function() {
      callback = stub();
    });

    it('should call put with the file name and destination directory with multifile', function() { 
      var filename = 'test.csv',
          username = 'TestKey';

      ftpOperations.upload(username, filename, null, callback);

      var serverLocation = '/import_' + username + '_splitfile_config/' + filename;
      calledOnceWith(ftpOperations.ftp.put, filename, serverLocation);
    });

    it('should call put with the file name and destination directory with singlefile', function() { 
      var filename = 'test.csv',
          username = 'TestKey'

      ftpOperations.upload(username, filename, true, callback);

      var serverLocation = '/import_' + username + '_default_config/' + filename;
      calledOnceWith(ftpOperations.ftp.put, filename, serverLocation);
    });

    it('should call the callback when put fails', function() { 
      var filename = 'test.csv';

      ftpOperations.upload('', filename, true, callback);
      ftpOperations.ftp.put.args[0][2]('An error');

      calledOnceWith(callback, 'An error');
    });

    it('should rewrite the message when "bad passive host/port" error occurs', function() { 
      var filename = 'test.csv';

      ftpOperations.upload('', filename, true, callback);
      ftpOperations.ftp.put.args[0][2]('Error: bad Passive host/port');// Capital P is intentional

      message = 'Error: An incorrect host, port, username, and/or password was entered';
      calledOnceWith(callback, message);
    });

    it('should watch jsftp_debug calling the callback only upon getting a file upload message and '+
       'set the uploadFileName',
    function() {
      ftpOperations.upload('', '', null, callback);

      calledOnceWith(ftpOperations.ftp.on, 'jsftp_debug');

      ftpOperations.ftp.on.args[0][1]('test', {code: 225});

      expect(callback.calledOnce).to.be.false;

      ftpOperations.ftp.on.args[0][1]('response', {code: 225});

      expect(callback.calledOnce).to.be.false;

      var file = 'source_sample_subscriber_data_20140519_0004.csv';
      ftpOperations.ftp.on.args[0][1]('response', {
        code: 226,
        text: '226 closing data connection; File upload success; ' + file
      });

      expect(callback.calledOnce).to.be.true;
      expect(ftpOperations.uploadFileName).to.equal(file);
      expect(ftpOperations.ftp.events + '').to.equal('function (){}');// V8 only test
    });

    it('should call the callback with the error text when the code is 550', function() {
      ftpOperations.upload('', '', null, callback);

      var text = '550 Insufficient credits (Upload ID: 5c835271b08622f30a125a421c8da0bf)';
      ftpOperations.ftp.on.args[0][1]('response', {
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
      stub(ftpOperations, 'reConnect');
      stub(console, 'log');

      filename = 'test1.csv';
      stub(ftpOperations, 'toDownloadFormat').returns(filename);

      ftpOperations.uploadFileName = null;
    });

    afterEach(function() {
      console.log.restore();
    });

    it('should set debugMode to false', function() {
      ftpOperations.watchUpload(100, callback);

      calledOnceWith(ftpOperations.ftp.setDebugMode, false);
    });

    it('should list the complete directory', function() {
      ftpOperations.watchUpload(100, callback);

      calledOnceWith(ftpOperations.ftp.list, '/complete');
    });

    describe('list callback', function() {
      it('should print that the data is formatted when the expected file is found and calls ' +
         'the callback and not reConnect', function() {
        ftpOperations.uploadFileName = filename;
        ftpOperations.watchUpload(100, callback);

        ftpOperations.ftp.list.args[0][1](false, 'test0.csv\n' + filename + 'test2.csv');

        calledOnceWith(console.log, filename, 'found.');
        calledOnceWith(callback);

        expect(ftpOperations.reConnect.called).to.be.false;
      });

      it('should call the callback and does not reconnect', function() {
        var error = 'ERROR: AUTHENTICATION ERROR';

        ftpOperations.watchUpload(100, callback);

        ftpOperations.ftp.list.args[0][1](error);

        calledOnceWith(callback, error);
        expect(ftpOperations.reConnect.called).to.be.false;
      });

      it('should print a not found message and then recalls watchUpload in some amount of time ' +
         'and reconnects', function() {
        var clock = sinon.useFakeTimers();

        ftpOperations.watchUpload(100, callback);

        ftpOperations.ftp.list.args[0][1](false, 'test0.csv\ntest2.csv');
        calledOnceWith(console.log, 'Waiting for results file', filename, '...');

        stub(ftpOperations, 'watchUpload');

        clock.timeouts[1].func();

        calledOnceWith(ftpOperations.watchUpload, 100, callback);
        expect(ftpOperations.reConnect.calledOnce).to.be.true;
      });
    });

    it('should call reconnect when the socket is not writable', function() {
      ftpOperations.ftp.socket.writable = false;

      ftpOperations.watchUpload(100, callback);

      expect(ftpOperations.reConnect.calledOnce).to.be.true;
    });
  });

  describe('download', function() {
    var callback;
    beforeEach(function() {
      callback = stub();
      stub(ftpOperations, 'watchUpload');
      stub(ftpOperations, 'toDownloadFormat').returns('test/test.zip');
    });

    it('should call watchUpload with a function that calls the callback on error', function() { 
      ftpOperations.download('', 100, false, callback);

      calledOnceWith(ftpOperations.watchUpload, 100);
      ftpOperations.watchUpload.args[0][1]('An Error');

      calledOnceWith(callback, 'An Error');
    });

    it('should call watchUpload with a function that call ftp get with the file name, destination '+
       'directory and callback', function() {
      var location = 'test/';

      ftpOperations.download(location, 100, false, callback);

      ftpOperations.watchUpload.args[0][1]();

      calledOnceWith(ftpOperations.ftp.get, '/complete/' + location + 'test.zip', 'test/test.zip');
    });

    it('should call the callback with the sent in error if there was one or not removeAfter for ' +
       'that function', function() {
      ftpOperations.download('', 100, false, callback);
      ftpOperations.watchUpload.args[0][1]();
      ftpOperations.ftp.get.args[0][2]('An Error');

      calledOnceWith(callback, 'An Error');

      ftpOperations.download('', false, callback);
      ftpOperations.watchUpload.args[0][1]();
      ftpOperations.ftp.get.args[0][2]();

      expect(callback.calledTwice).to.be.true
    });

    it('should call ftp\'s remove with the callback if there was no error and !!removeAfter for ' +
       'that function', function() {
      stub(ftpOperations, 'remove');

      ftpOperations.download('', 100, true, callback);
      ftpOperations.watchUpload.args[0][1]();
      ftpOperations.ftp.get.args[0][2]();

      calledOnceWith(ftpOperations.remove, callback);
    });
  });

  describe('remove', function() {
    it('should call ftp raw\'s dele with the sent in callback and result file name', function() {
      var callback = stub();
      ftpOperations.uploadFileName = 'test.csv'

      ftpOperations.remove(callback);

      calledOnceWith(ftpOperations.ftp.raw.dele, '/complete/test.zip', callback);
    });
  });

  describe('quit', function() {
    it('should call ftp raw\'s quit with the sent in callback', function() {
      var callback = stub();

      ftpOperations.quit(callback);

      calledOnceWith(ftpOperations.ftp.raw.quit, callback);
    });
  });
});