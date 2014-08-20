/**
 * Tests all functions in httpOperations.js.
 * NOTE: mocha needs to be installed as global: npm install -g mocha
 **/

var sinon = require('sinon'),
    stub = sinon.stub,
    chai = require('chai'),
    expect = chai.expect;

var fs = require('fs'),
    http = require('http'),
    rest = require('restler'),
    HttpOperations = require('./httpOperations');

describe('HttpOperations', function() {
  var httpOperations, password, port, host;
  beforeEach(function() {
    password = 'e261742d-fe2f-4569-95e6-312689d04903';
    port = 9871;
    host = 'localhost';

    httpOperations = new HttpOperations();
  });

  var genericInit = function() {
    return httpOperations.init({
      host: host,
      port: port,
      password: password,
    });
  };

  var calledOnceWith = function(_stub /*arg1, arg2,...*/) {
    var args = Array.prototype.slice.call(arguments, 1);

    expect(_stub.calledOnce).to.be.true;
    expect(_stub.calledWith.apply(_stub, args)).to.be.true;
  };

  it('should initialize the various object wide variables to null', function() {
    httpOperations = new HttpOperations();

    expect(httpOperations.http).to.equal(null);
    expect(httpOperations.baseUrl).to.equal(null);
    expect(httpOperations.statusUrls).to.equal(null);
    expect(httpOperations.downloadUrl).to.equal(null);
    expect(httpOperations.apikey).to.equal(null);
    expect(httpOperations.downloadError).to.equal(null);
  });

  describe('init', function() {
    it('should set the baseUrl and apikey', function() {
      genericInit();
      expect(httpOperations.baseUrl).to.equal('http://' + host + ':' + port + '/api/live/bulk/');
      expect(httpOperations.apikey).to.equal(password);
    });

    it('should set the port to 8080 when it is not specified', function() {
      httpOperations.init({
        host: host,
        password: password,
      });

      expect(httpOperations.baseUrl).to.equal('http://' + host + ':8080/api/live/bulk/');
    });

    it('should return the newly created http object', function() {
      expect(genericInit()).to.deep.equal(httpOperations.http);
    });
  });

  describe('doCall', function() {
    var methodCallback, onFirst, onSecond, callback, onSuccess, onError;
    beforeEach(function() {
      callback = stub();
      onSecond = stub();
      onFirst = stub().returns({on: onSecond});
      methodCallback = stub().returns({on: onFirst});
      onSuccess = stub();
      onError = stub();
    });

    it('should call the method callback with the url and options combined with header', function() {
      httpOperations.apikey = '12345';
      var options = {
        test: 'test'
      }

      httpOperations.doCall(methodCallback, 'http://localhost:80/test', options);

      var combinedOptions = {
        test: options.test,
        headers: {
          'x-authorization': '12345'
        }
      }
      calledOnceWith(methodCallback, 'http://localhost:80/test', combinedOptions);
    });

    it('should call the callback with the prescibed error on a successful request', function() {
      httpOperations.doCall(methodCallback, '', {}, null, null, callback);
      onFirst.args[0][1]({
        error: 'test',
        msg: 'An Error'
      });

      calledOnceWith(callback, 'An Error');

      callback.callCount = 0;
      onFirst.args[0][1]({
        status: 'error',
        msg: 'An Error'
      });

      calledOnceWith(callback, 'An Error');
    });

    it('should call onSuccess with resp. on a successful request with no server error', function() {
      httpOperations.doCall(methodCallback, '', {}, onSuccess, null, callback);
      var data = {test: 'test'};
      onFirst.args[0][1](data);

      calledOnceWith(onSuccess, data);
      expect(callback.called).to.be.false;
    });

    it('should call onError with response on an errored request', function() {
      httpOperations.doCall(methodCallback, '', {}, null, onError, callback);
      var data = {test: 'test'};
      onSecond.args[0][1](data);

      calledOnceWith(onError, data);
      expect(callback.called).to.be.false;
    });
  });

  describe('upload', function() {
    var callback, fileInfo;
    beforeEach(function() {
      fileInfo = 'testInfo';

      callback = stub();
      stub(fs, 'stat');
      stub(httpOperations, 'doCall');
      stub(rest, 'file').returns(fileInfo);
    });

    afterEach(function() {
      fs.stat.restore();
      rest.file.restore();
    });

    var checkOption = function(uploadArgs, value, shouldBe) {
      httpOperations.location = 'http://localhost:80';
      httpOperations.apikey = '12345';

      httpOperations.upload.apply(null, uploadArgs);
      fs.stat.args[0][1](null, 2000);

      expect(httpOperations.doCall.args[0][2].data[value]).to.equal(shouldBe);
    }

    it('should call the callback with the error from retrieving file statistics', function() {
      httpOperations.upload('test.csv', false, null, callback);

      calledOnceWith(fs.stat, 'test.csv');

      fs.stat.args[0][1]('An Error');

      calledOnceWith(callback, 'An Error');
    });

    it('should doCall with the correct configuration', function() {
      httpOperations.baseUrl = 'http://localhost:80';
      httpOperations.apikey = '12345';

      httpOperations.upload('test.csv', false, null, callback);
      fs.stat.args[0][1](null, {size: 2000});

      calledOnceWith(rest.file, 'test.csv', null, 2000);

      calledOnceWith(httpOperations.doCall, rest.post, 'http://localhost:80', {
        multipart: true,
        data: {
          file: fileInfo,
          export_type: 'multi',
          notify_email: ''
        }
      });
    });

    it('should doCall with single when singleFile is true', function() {
      checkOption(['', true, null, callback], 'export_type', 'single');
    });

    it('should doCall with single when singleFile is true', function() {
      checkOption(['', false, 'test@test.com', callback], 'notify_email', 'test@test.com');
    });

    it('should call the callback with an error when the connection is refused',
      function() {
      httpOperations.upload('', true, null, callback);
      fs.stat.args[0][1](null, 2000);
      httpOperations.doCall.args[0][4]({
        code: 'ECONNREFUSED'
      });

      calledOnceWith(callback,'Error: The connection to ' +httpOperations.baseUrl +' was refused.');
    });

    it('should call the callback with nothing on a successful request and set the status url',
      function() {
      httpOperations.upload('', true, null, callback);
      fs.stat.args[0][1](null, 2000);
      httpOperations.doCall.args[0][3]({
        status: 'success',
        status_url: 'http://localhost:82/status'
      });

      expect(httpOperations.statusUrls).to.deep.equal(['http://localhost:82/status']);
      calledOnceWith(callback, undefined);
    });

    it('should do the same as the last, but set the status urls if the file was split ' + 
       'and print a file was split message.',
      function() {
      stub(console, 'log');

      httpOperations.upload('', true, null, callback);
      fs.stat.args[0][1](null, 2000);
      httpOperations.doCall.args[0][3]({
        status: 'success',
        jobs: [ 
          {
            msg: 'test.csv was automatically split',
            status_url: 'http://localhost:82/status1'
          },
          {
            msg: 'test.csv was automatically split',
            status_url: 'http://localhost:82/status2'
          }
       ]
      });

      expect(httpOperations.statusUrls).deep.equal([
        'http://localhost:82/status1',
        'http://localhost:82/status2'
      ]);
      calledOnceWith(callback, undefined);
      calledOnceWith(console.log, 'test.csv was automatically split');

      console.log.restore();
    });

    it('should not print a message if the file was not split',
      function() {
      stub(console, 'log');

      httpOperations.upload('', true, null, callback);
      fs.stat.args[0][1](null, 2000);
      httpOperations.doCall.args[0][3]({
        status: 'success',
        jobs: [ 
          {
            msg: 'test.csv was automatically split',
            status_url: 'http://localhost:82/status1'
          }
       ]
      });

      expect(console.log.called).to.be.false;

      console.log.restore();
    });
  });

  describe('watchUpload', function() {
    var callback;
    beforeEach(function() {
      callback = stub();

      stub(httpOperations, 'doCall');
    });

    it('should doCall with the statusUrl', function() {
      httpOperations.apikey = '12345';

      httpOperations.watchUpload(100, 'http://localhost:82/status', callback);

      calledOnceWith(httpOperations.doCall, rest.get, 'http://localhost:82/status', {});
    });

    it('should recall the watchUpload after the poll time with the send in args and print a ' + 
       'polling message', function() {
      var clock = sinon.useFakeTimers();
      stub(console, 'log');

      httpOperations.watchUpload(100, 'http://localhost:82/status', callback);

      stub(httpOperations, 'watchUpload');
      httpOperations.doCall.args[0][3]({
        status: 'active',
        job: 'ajob_csv'
      });

      clock.timeouts[2].func();

      expect(clock.timeouts[2].callAt).to.equal(100);
      calledOnceWith(console.log, 'Waiting for the job', 'ajob_csv', '...');
      calledOnceWith(httpOperations.watchUpload, 100, 'http://localhost:82/status', callback);

      console.log.restore();
    });

    it('should call the callback with nothing and set the downloadUrl on a successful request ' +
       'when the file is found', function() {
      httpOperations.watchUpload(100, null, callback);
      httpOperations.doCall.args[0][3]({
        status: 'completed',
        download_url: 'http://localhost:82/thejob/download'
      });

      expect(httpOperations.downloadUrl).to.equal('http://localhost:82/thejob/download');
      calledOnceWith(callback, undefined);
    });

    it('should call the callback with the error code on an unsuccessful request', function() {
      httpOperations.watchUpload(100, null, callback);
      httpOperations.doCall.args[0][4]({
        code: 'ECONNREFUSED'
      });

      calledOnceWith(callback, 'ECONNREFUSED');
    });
  });

  describe('download', function() {
    var callback, onError, onFinish, onClose;
    beforeEach(function() {
      callback = stub();
      onError = stub();
      onFinish = stub();
      onClose = stub();

      stub(httpOperations, 'watchUpload');
      stub(httpOperations, 'handleServerDownloadError');
      stub(httpOperations, 'remove');
      stub(http, 'get').returns({on: onError});
      stub(fs, 'createWriteStream').returns({on: onFinish, close: onClose});
      httpOperations.statusUrls = [
        'http://localhost:80/status/part1/test_file',
        'http://localhost:80/status2/part2/test_file'
      ];
      
      httpOperations.downloadUrl = 'http://localhost:80/test_file/download';
    });

    afterEach(function() {
      http.get.restore();
      fs.createWriteStream.restore();
    });

    it('should call watchUpload with the polling time and each statusUrl', function() {
      httpOperations.download('/tmp', 100, false, callback);

      var watch = httpOperations.watchUpload;
      expect(watch.calledTwice).to.be.true;
      expect(watch.args[0][0]).to.equal(100);
      expect(watch.args[0][1]).to.equal('http://localhost:80/status/part1/test_file');
      expect(watch.args[1][0]).to.equal(100);
      expect(watch.args[1][1]).to.equal('http://localhost:80/status2/part2/test_file');
    });

    it('should call callback with an error when watchUpload has one', function() {
      httpOperations.download('/tmp', 100, false, callback);
      httpOperations.watchUpload.args[0][2]('An Error');

      calledOnceWith(callback, 'An Error');
    });

    it('should call http get with the right download info', function() {
      httpOperations.download('/tmp', 100, false, callback);

      httpOperations.apikey = '12345';

      httpOperations.watchUpload.args[0][2]();

      calledOnceWith(http.get, {
        hostname: 'localhost',
        port: '80',
        path: '/test_file/download',
        headers: {
          'x-authorization': '12345'
        }
      });
    });

    it('should call handleServerDownloadError with the response from the get response', function() {
      httpOperations.download('/tmp', 100, false, callback);

      httpOperations.watchUpload.args[0][2]();

      var pipe = stub();
      http.get.args[0][1]({pipe: pipe});

      calledOnceWith(httpOperations.handleServerDownloadError, {pipe: pipe});
    });

    it('should pipe the file to the response and an error to the callback if needed', function() {
      httpOperations.download('/tmp', 100, false, callback);

      httpOperations.watchUpload.args[0][2]();
      httpOperations.downloadError = 'An Error';

      var pipe = stub();
      http.get.args[0][1]({pipe: pipe});

      calledOnceWith(fs.createWriteStream, '/tmp/test_file.zip');
      calledOnceWith(pipe, {on: onFinish, close: onClose});
      calledOnceWith(onFinish, 'finish');

      onFinish.args[0][1]();
      calledOnceWith(onClose);
      
      onClose.args[0][0]();
      calledOnceWith(callback, 'An Error');
      expect(httpOperations.remove.calledOnce).to.be.false;
    });

    it('should call remove if removeAfter was specified and there was no download err', function() {
      httpOperations.download('/tmp', 100, true, callback);
      httpOperations.watchUpload.args[1][2]();
      http.get.args[0][1]({pipe: stub()});
      onFinish.args[0][1]();
      onClose.args[0][0]();

      calledOnceWith(httpOperations.remove);
      httpOperations.remove.args[0][0]('test');

      calledOnceWith(callback, 'test', '/tmp/test_file.zip');
    });

    it('should unlink the file and call the callback with the error on a connect err', function() {
      httpOperations.download('/tmp', 100, false, callback);

      stub(fs, 'unlink');
      httpOperations.watchUpload.args[0][2]();

      calledOnceWith(onError, 'error');
      onError.args[0][1]('An Error');

      calledOnceWith(fs.unlink, '/tmp/test_file.zip');
      calledOnceWith(callback, 'An Error');

      fs.unlink.restore();
    });
  });

  describe('handleServerDownloadError', function() {
    var response;
    beforeEach(function() {
      response = {
        on: stub()
      }
    })

    it('should set downloadError to null', function() {
      httpOperations.handleServerDownloadError(response);

      expect(httpOperations.downloadError).to.equal(null);
    });

    it('should not set downloadError if the chunk is greater than 200', function() {
      httpOperations.handleServerDownloadError(response);

      calledOnceWith(response.on, 'data');
      response.on.args[0][1](Array(201).join('a'));

      expect(httpOperations.downloadError).to.equal(null);
    });

    it('should call set downloadError and set a parse error with a unparsable respons', function() {
      httpOperations.handleServerDownloadError(response);

      calledOnceWith(response.on, 'data');
      response.on.args[0][1](Array(199).join('a'));

      expect(httpOperations.downloadError + '').to.equal('SyntaxError: Unexpected token a');
    });

    it('should call set downloadError with the error when the response is parsable', function() {
      httpOperations.handleServerDownloadError(response);

      calledOnceWith(response.on, 'data');
      response.on.args[0][1]('{"error": "error", "msg": "An Error"}');

      expect(httpOperations.downloadError).to.equal('An Error');
    });
  });

  describe('remove', function() {
    var callback
    beforeEach(function() {
      callback = stub();
      stub(httpOperations, 'doCall');
    });

    it('should doCall with the right connection info', function() {
      httpOperations.apikey = '12345';
      httpOperations.statusUrl = 'http://localhost:82/status';

      httpOperations.remove(callback);

      calledOnceWith(httpOperations.doCall, rest.del, httpOperations.statusUrl, {});
    });

    it('should call the callback with nothing on a successful request', function() {
      httpOperations.remove(callback);
      httpOperations.doCall.args[0][3]();
      calledOnceWith(callback, undefined);
    });

    it('should call the callback with the error code on a unsuccessful request', function() {
      httpOperations.remove(callback);
      httpOperations.doCall.args[0][4]({
        code: 'ECONNREFUSED'
      });

      calledOnceWith(callback, 'ECONNREFUSED');
    });
  });
});