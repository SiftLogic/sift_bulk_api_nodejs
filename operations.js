var JSFtp = require('jsftp'),
    FtpOperations = require('./ftpOperations'),
    HttpOperations = require('./httpOperations');

/** 
 * Contains all the operations to upload, poll and download files. The constructor adds connection
 * and polling options to the class.
 * @class Operations
 * @constructor
 *
 * @param {Object} opts Options for connecting to the server
 * @param {string} opts.username The username to get into the ftp server.
 * @param {string} opts.password The password to get into the ftp server
 * @param {string=} [opts.host="localhost"] The host to connect to.
 * @param {string=} [opts.port=21|80] The port to connect to. Defaults to 21 or 80, if ftp or http,
 *                                    if falsey.
 * @param {string=} [opts.polling="300"] Poll every polling seconds. 300 = 5 minutes.
 * @param {string=} [opts.protocol="http"] What protocol to use to transfer data. Defaults to http.
 * 
 * @returns {Operations} Instantiated version of the options class.
 */
module.exports = function(opts) {
  'use strict';

  // Much easier to do error checking when the protocol is only accessable via getters/setters
  var protocol;

  // Need to make this accessible to the constructor
  var setProtocol = function(newProtocol) {
    // Throwing readable errors for the protocol type
    if (newProtocol !== 'http' && newProtocol !== 'ftp'){
      throw('Error: The ' + newProtocol + ' protocol is not supported.');
    }

    protocol = newProtocol;
  }
  
  var self = {
    username: opts.username,
    password: opts.password,
    host: opts.host || 'localhost',
    port: opts.port,

    uploadFileName: null,// Set on upload
    FtpOperations: FtpOperations,// Make testing what is sent to this possible
    HttpOperations: HttpOperations,// Make testing what is sent to this possible
    ftp: null,

    POLL_EVERY: (opts.polling || 300) * 1000// convert seconds to milliseconds
  };
  setProtocol(opts.protocol || 'http');

  /**
   * @description
   * Initializes the connection with the connection options (username, key, host port).
   *
   * @returns {Operations} The same instantiated value that the constructor returns.
   */
  self.init = function() {
    if (self.getProtocol() === 'ftp'){
      self.ftpOperations = self.FtpOperations();
      self.ftpOperations.init({
        host: self.host,
        port: self.port,
        username:  self.username,
        password: self.password
      });
    } else{
      self.httpOperations = self.HttpOperations();
      self.httpOperations.init({
        host: self.host,
        port: self.port,
        username:  self.username,
        password: self.password
      });
    }

    return self;
  };

  /**
   * @description
   * Uploads the given file, Making it watch debug info until the file is successfully uploaded.

   * @param {string} filename The local file to upload.
   * @param {boolean=}  singleFile Whether to upload in singleFile mode.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.upload = function(filename, singleFile, callback) {
    if (self.getProtocol() === 'ftp'){
      self.ftpOperations.upload(self.username, filename, singleFile, callback);
    } else {
      self.httpOperations.upload(filename, singleFile, callback);
    }
  };

  /**
   * @description
   * Downloads the last uploaded file (self.uploadFileName).
   *
   * @param {string} location The location to download the file to.
   * @param {boolean} [removeAfter=false] If the results file should be removed after downloading.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.download = function(location, removeAfter, callback) {
    self.ftpOperations.download(location, self.POLL_EVERY, removeAfter, callback);
  };

  /**
   * @description
   * Removes the results file from the server.
   *
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.remove = function(callback) {
    self.ftpOperations.remove(callback);
  };

  /**
   * @description
   * Quits the connection.
   *
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.quit = function(callback) {
    self.ftpOperations.quit(callback);
  };


  /**
   * @description
   * Getter
   *
   * @returns {string} protocol The protocol string
   */
  self.getProtocol = function() {
    return protocol;
  }

  /**
   * @description
   * Setter
   *
   * @param {string} newProtocol The protocol string to set to
   */
  self.setProtocol = setProtocol;

  return self;
};