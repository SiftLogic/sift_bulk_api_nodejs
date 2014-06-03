var JSFtp = require('jsftp');

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
 * @param {string=} [opts.port="21"] The port to connect to. Defaults to 21 if falsey.
 * @param {string=} [opts.polling="300"] Poll every polling seconds. 300 = 5 minutes.
 * 
 * @returns {Operations} Instantiated version of the options class.
 */
module.exports = function(opts) {
  'use strict';
  
  var self = {
    username: opts.username,
    password: opts.password,
    host: opts.host || 'localhost',
    port: opts.port || 21,

    uploadFileName: null,// Set on upload
    JSFtp: JSFtp,// Make testing what is sent to this possible
    ftp: null,

    POLL_EVERY: (opts.polling || 300) * 1000// convert seconds to milliseconds
  };

  /**
   * @description
   * Initializes JSFtp in debug mode with the connection options (username, key, host port).
   *
   * @returns {Operations} The same instantiated value that the constructor returns.
   */
  self.init = function() {
    self.ftp = new self.JSFtp({
      host: self.host,
      port: self.port,
      user:  self.username,
      pass: self.password,
      debugMode: true
    });

    return self;
  };

  /**
   * @description
   * Retrieves the upload file name and transforms it to the download one. 
   *
   * @param {string} filename The filename to convert.
   *
   * @returns {string} The current download name of the current upload.
   */
  self.toDownloadFormat = function(filename) {
    if (!filename){
      return filename;
    }

    return filename.replace('source_', 'archive_')// Replace the first only
                   .replace(new RegExp('.csv$'), '.zip')
                   .replace(new RegExp('.txt$'), '.zip');
  };

  /**
   * @description
   * Calls the callback once the last uploaded file (uploadFileName) has been loaded or there is 
   * an error. Reconnects for every request to deal with the lost connections.
   *
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.watchUpload = function(callback) {
    // Stop the earlier jsftp_debug listener, it interferes with jsftp's libraries listing operation
    self.ftp.setDebugMode(false);

    if (self.ftp.socket.writable){
      self.ftp.list('/complete', function(err, res) {
        if (err){
          callback(err);
        }

        var formatted = self.toDownloadFormat(self.uploadFileName);
        if (res && res.indexOf(formatted) > -1){
          console.log(formatted, 'found.');

          callback();
        } else {
          console.log('Waiting for results file', formatted, '...');

          setTimeout(function() {
            self.reConnect();
            self.watchUpload(callback);
          }, self.POLL_EVERY);
        }
      });
    } else {
      self.reConnect();
    }
  };

  /**
   * @description
   * Recreates a connection by using the sent in connection info (username, key, host port).
   */
  self.reConnect = function() {
    self.ftp.destroy();

    self.ftp = new self.JSFtp({
      host: self.host,
      port: self.port,
      user: self.username,
      pass: self.password
    });
  };

  /**
   * @description
   * Uploads the given file, Making it watch debug info until the file is successfully uploaded.

   * @param {string} filename The local file to upload.
   * @param {boolean=}  singleFile Whether to upload in singleFile mode.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.upload = function(filename, singleFile, callback) {
    self.ftp.on('jsftp_debug', function(eventType, data) {
      if (eventType === 'response' && data){
        // File was successfully uploaded
        if (data.code === 226){
          self.ftp.events = function(){};
          self.uploadFileName = data.text.split('; ').slice(-1)[0].trim();

          callback();
        // A error with the file or backend specifically. e.g. Not enough credits
        } else if (data.code === 550){
          callback(data.text);
        }
      }
    });

    var type = (singleFile) ? 'default' : 'splitfile';
    var serverLocation ='/import_' + self.username + '_'+type+'_config/' +filename.split('/').pop();
    self.ftp.put(filename, serverLocation, function(err) {
      if (err){
        callback(err);
      }
    });
  };

  /**
   * @description
   * Polls until the results can be downloaded. Uses the last uploaded file (self. uploadFileName) 
   * to do this.
   *
   * @param {string} location The location to download the file to.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.download = function(location, callback) {
    self.watchUpload(function(err) {
      if (err){
        return callback(err);
      }
      location = location.replace(new RegExp('\/$'), '');// Remove trailing slash if present

      var filename = self.toDownloadFormat(self.uploadFileName);
      self.ftp.get('/complete/' + filename, location + '/' + filename.split('/').pop(), callback);
    })
  };

  /**
   * @description
   * Closes the ftp connection, should be done after each download
   *
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.quit = function(callback) {
    self.ftp.raw.quit(callback);
  };

  return self;
};