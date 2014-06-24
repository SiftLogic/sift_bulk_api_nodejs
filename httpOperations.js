var fs = require('fs'),
    rest = require('restler');
/** 
 * Handles HTTP based operations across the system.
 * @class FtpOperations
 * @constructor
 *
 * @returns {Operations} Instantiated version of this class.
 */

module.exports = function() {
  var self = {
    http: null,
    location: null,
    apikey: null
  };

  /**
   * @description
   * Setups the http connection.
   * 
   * @param {Object} Has connection information.(password, host, port). The port is 80 by default.
   **/
  self.init = function init(opts) {
    opts.port = opts.port || 80;

    self.location = 'http://' + opts.host + ':' + opts.port + '/api/live/bulk/';
    self.apikey = opts.password;

    return self.http;
  };

  /**
   * @description
   * Uploads the given file.
   *
   * @param {string} filename The local file to upload.
   * @param {boolean=}  singleFile Whether to upload in singleFile mode.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.upload = function(filename, singleFile, callback) {
    fs.stat(filename, function(err, stats) {
      if (err) {
        return callback(err);
      }

      rest.post(self.location, {
        headers: {
          'x-authorization': self.apikey
        },

        multipart: true,
        data: {
          file: rest.file(filename, null, stats.size),
          export_type: singleFile ? 'single' : 'multi'
        }
      // Need to handle connection and custom errors from the server.
      }).on('success', function(data) {
        if(data.status === 'error'){
          return callback(data.error);
        }

        return callback();
      }).on('error', function(error) {
        return callback(error.code);
      });
    });
  };

  return self;
};