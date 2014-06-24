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

  it('should initialize the http libary and location to null', function() {
    httpOperations = new HttpOperations();

    expect(httpOperations.http).to.equal(null);
    expect(httpOperations.location).to.equal(null);
    expect(httpOperations.apikey).to.equal(null);
  });

  describe('init', function() {
    it('should set the location and apikey', function() {
      genericInit();
      expect(httpOperations.location).to.equal('http://' + host + ':' + port + '/api/live/bulk/');
      expect(httpOperations.apikey).to.equal(password);
    });

    it('should set the port to 80 when it is not specified', function() {
      httpOperations.init({
        host: host,
        password: password,
      });

      expect(httpOperations.location).to.equal('http://' + host + ':80/api/live/bulk/');
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

    afterEach(function(){
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
      httpOperations.location = 'http://localhost:80';
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
        error: 'An Error'
      });

      calledOnceWith(callback, 'An Error');
    });

    it('should call the callback with nothing on a successful non error request', function() {
      httpOperations.upload('', true, callback);
      fs.stat.args[0][1](null, 2000);
      onSuccess.args[0][1]({
        status: 'success'
      });

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
});