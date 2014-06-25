/**
 * Tests all functions in httpOperations.js.
 * NOTE: mocha needs to be installed as global: npm install -g mocha
 **/

var sinon = require('sinon'),
    stub = sinon.stub,
    chai = require('chai'),
    expect = chai.expect;

var fs = require('fs'),
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
    expect(httpOperations.statusUrl).to.equal(null);
    expect(httpOperations.downloadUrl).to.equal(null);
    expect(httpOperations.apikey).to.equal(null);
  });

  describe('init', function() {
    it('should set the baseUrl and apikey', function() {
      genericInit();
      expect(httpOperations.baseUrl).to.equal('http://' + host + ':' + port + '/api/live/bulk/');
      expect(httpOperations.apikey).to.equal(password);
    });

    it('should set the port to 80 when it is not specified', function() {
      httpOperations.init({
        host: host,
        password: password,
      });

      expect(httpOperations.baseUrl).to.equal('http://' + host + ':80/api/live/bulk/');
    });

    it('should return the newly created http object', function() {
      expect(genericInit()).to.deep.equal(httpOperations.http);
    });
  });

  describe('upload', function() {
    var callback, fileInfo, onSuccess, onError;
    beforeEach(function() {
      fileInfo = 'testInfo';
      onError = stub();
      onSuccess = stub().returns({on: onError});

      callback = stub();
      stub(fs, 'stat');
      stub(rest, 'post').returns({on: onSuccess});
      stub(rest, 'file').returns(fileInfo);
    });

    afterEach(function() {
      fs.stat.restore();
      rest.post.restore();
      rest.file.restore();
    })

    it('should call the callback with the error from retrieving file statistics', function() {
      httpOperations.upload('test.csv', false, callback);

      calledOnceWith(fs.stat, 'test.csv');

      fs.stat.args[0][1]('An Error');

      calledOnceWith(callback, 'An Error');
    });

    it('should call restlers post with the correct configuration', function() {
      httpOperations.baseUrl = 'http://localhost:80';
      httpOperations.apikey = '12345';

      httpOperations.upload('test.csv', false, callback);
      fs.stat.args[0][1](null, {size: 2000});

      calledOnceWith(rest.file, 'test.csv', null, 2000);
      calledOnceWith(rest.post, 'http://localhost:80', {
        headers: {
          'x-authorization': '12345'
        },

        multipart: true,
        data: {
          file: fileInfo,
          export_type: 'multi'
        }
      });
    });

    it('should call restlers post with single when singleFile is true', function() {
      httpOperations.location = 'http://localhost:80';
      httpOperations.apikey = '12345';

      httpOperations.upload('', true, callback);
      fs.stat.args[0][1](null, 2000);

      expect(rest.post.args[0][1].data.export_type).to.equal('single');
    });

    it('should call the callback with the prescibed error on a successful request', function() {
      httpOperations.upload('', true, callback);
      fs.stat.args[0][1](null, 2000);
      onSuccess.args[0][1]({
        status: 'error',
        msg: 'An Error'
      });

      calledOnceWith(callback, 'An Error');
    });

    it('should call the callback with nothing on a successful non error request and set the status'+
       ' url', function() {
      httpOperations.upload('', true, callback);
      fs.stat.args[0][1](null, 2000);
      onSuccess.args[0][1]({
        status: 'success',
        status_url: 'http://localhost:82/status'
      });

      expect(httpOperations.statusUrl).to.equal('http://localhost:82/status');
      calledOnceWith(callback, undefined);
    });

    it('should call the callback with the error code on an unsuccessful request', function() {
      httpOperations.upload('', true, callback);
      fs.stat.args[0][1](null, 2000);
      onError.args[0][1]({
        code: 'ECONNREFUSED'
      });

      calledOnceWith(callback, 'ECONNREFUSED');
    });
  });

  describe('watchUpload', function() {
    var callback, onSuccess, onError;
    beforeEach(function() {
      callback = stub();

      onError = stub();
      onSuccess = stub().returns({on: onError});

      stub(rest, 'get').returns({on: onSuccess});
    });

    afterEach(function() {
      rest.get.restore();
    })

    it('should call restlers get with the statusUrl and authorization header', function() {
      httpOperations.statusUrl = 'http://localhost:82/status';
      httpOperations.apikey = '12345';

      httpOperations.watchUpload(100, callback);

      calledOnceWith(rest.get, 'http://localhost:82/status', {
        headers: {
          'x-authorization': httpOperations.apikey
        }
      });
    });

    it('should call the callback with the error message when one occurs', function() {
      httpOperations.watchUpload(100, callback);
      onSuccess.args[0][1]({
        status: 'error',
        msg: 'An Error'
      });

      calledOnceWith(callback, 'An Error');
    });

    it('should recall the watchUpload after the poll time with the send in args and print a ' + 
       'polling message', function() {
      var clock = sinon.useFakeTimers();
      stub(console, 'log');

      httpOperations.watchUpload(100, callback);

      stub(httpOperations, 'watchUpload');
      onSuccess.args[0][1]({
        status: 'active',
        job: 'ajob_csv'
      });

      clock.timeouts[2].func();

      expect(clock.timeouts[2].callAt).to.equal(100);
      calledOnceWith(console.log, 'Waiting for the job', 'ajob_csv', '...');
      calledOnceWith(httpOperations.watchUpload, 100, callback);

      console.log.restore();
    });

    it('should call the callback with nothing and set the downloadUrl on a successful request ' +
       'when the file is found', function() {
      httpOperations.watchUpload(100, callback);
      onSuccess.args[0][1]({
        status: 'completed',
        download_url: 'http://localhost:82/thejob/download'
      });

      expect(httpOperations.downloadUrl).to.equal('http://localhost:82/thejob/download');
      calledOnceWith(callback, undefined);
    });

    it('should call the callback with the error code on an unsuccessful request', function() {
      httpOperations.watchUpload(100, callback);
      onError.args[0][1]({
        code: 'ECONNREFUSED'
      });

      calledOnceWith(callback, 'ECONNREFUSED');
    });
  });
});