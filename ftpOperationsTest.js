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

    stub(ftpOperations, 'JSFtp').returns(function(opts) {
      return {
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
      };
    });
  });

  it('should set the connection options from instantiation', function() {
    expect(ftpOperations.ftp).to.equal(null);
  });

  describe('init', function() {
    it('should set the connection options', function() {
      ftpOperations.init({
        username: username,
        password: password,
        host: host,
        port: port
      });

      expect(ftpOperations.JSFtp.calledWith({
        host: host,
        port: port,
        user: username,
        pass: password,
        debugMode: true
      })).to.be.true;
    });
  });
});