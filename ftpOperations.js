var JSFtp = require('jsftp');

/** 
 * Handles all FTP based operations across the system.
 * @class FtpOperations
 * @constructor
 *
 * @returns {FtpOperations} Instantiated version of this class.
 */

module.exports = function() {
  var self = {
    JSFtp: JSFtp,// Make testing what is sent to this possible
    ftp: null
  };

  /**
   * @description
   * Setups the ftp connection.
   * 
   * @param {Object} Has connection information.(username, key, host, port). The port is 21 by
   *                 default.
   **/
  self.init = function init(opts) {
    opts = opts || init.opts;
    opts.port = opts.port || 21;

    self.ftp = new self.JSFtp({
      host: opts.host,
      port: opts.port,
      user: opts.username,
      pass: opts.password,
      debugMode: true
    });

    // Cache a copy of opts for easier reinitialization
    init.opts = opts;

    return self.ftp;
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
   * Recreates a connection by using the sent in connection info (username, key, host port).
   *
   * @param {Object} Has connection information.(username, key, host, port).
   */
  self.reConnect = function() {
    self.ftp.destroy();

    self.init();
    self.ftp.setDebugMode(false);

    return self.ftp;
  };

  /**
   * @description
   * Uploads the given file, Making it watch debug info until the file is successfully uploaded.
   *
   * @param {string} username The username to use in the filename.
   * @param {string} filename The local file to upload.
   * @param {boolean=}  singleFile Whether to upload in singleFile mode.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.upload = function(username, filename, singleFile, callback) {
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
    var serverLocation ='/import_' + username + '_'+type+'_config/' +filename.split('/').pop();
    self.ftp.put(filename, serverLocation, function(err) {
      // Make the message more intuitive, this could be an authentication error.
      if (err && ((err + '').toLowerCase() + '').indexOf('bad passive host/port') > -1){
        err = 'Error: An incorrect host, port, username, and/or password was entered';
      }

      if (err){
        callback(err);
      }
    });
  };

  /**
   * @description
   * Calls the callback once the last uploaded file (uploadFileName) has been loaded or there is 
   * an error. Reconnects for every request to deal with the lost connections.
   *
   * @param pollEvery The number of milleseconds to poll for.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
    self.watchUpload = function(pollEvery, callback) {
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
              self.watchUpload(pollEvery, callback);
            }, pollEvery);
          }
        });
      } else {
        self.reConnect();
      }
    };

  /**
   * @description
   * Polls until the results can be downloaded. Uses the last uploaded file (self. uploadFileName) 
   * to do this.
   *
   * @param {string} location The path and file to download to.
   * @param pollEvery The number of milleseconds to poll for.
   * @param {boolean} [removeAfter=false] If the results file should be removed after downloading.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.download = function(location, pollEvery, removeAfter, callback) {
    self.watchUpload(pollEvery, function(err) {
      if (err){
        return callback(err);
      }
      location = location.replace(new RegExp('\/$'), '');// Remove trailing slash if present

      var filename = self.toDownloadFormat(self.uploadFileName);
      self.ftp.get('/complete/' + filename, location + '/' + filename.split('/').pop(), function(err) {
        if (err || !removeAfter){
          return callback(err);
        }

        self.remove(callback);
      });
    });
  };

  /**
   * @description
   * Removes the specified file from the server.
   *
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.remove = function(callback) {
    self.ftp.raw.dele('/complete/' + self.toDownloadFormat(self.uploadFileName), callback);
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