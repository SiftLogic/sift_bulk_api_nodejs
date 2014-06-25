var fs = require('fs'),
    rest = require('restler'),
    http = require('http'),
    url = require('url');

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
    baseUrl: null,// Set on init
    statusUrl: null,// Set on upload
    downloadUrl: null,// Set on a successful finish of polling for watchUpload
    apikey: null,
    downloadError: null,// If any download error occurs it will be stored here
  };

  /**
   * @description
   * Setups the http connection.
   * 
   * @param {Object} Has connection information.(password, host, port). The port is 80 by default.
   **/
  self.init = function init(opts) {
    opts.port = opts.port || 80;

    self.baseUrl = 'http://' + opts.host + ':' + opts.port + '/api/live/bulk/';
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

      rest.post(self.baseUrl, {
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
          return callback(data.msg);
        }

        self.statusUrl = data.status_url;

        return callback();
      }).on('error', function(error) {
        return callback(error.code);
      });
    });
  };

  /**
   * @description
   * Calls the callback once the last uploaded file (indicated by status url) has been loaded or 
   * there is an error.
   *
   * @param pollEvery The number of milleseconds to poll for.
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
    self.watchUpload = function(pollEvery, callback) {
      rest.get(self.statusUrl, {
        headers: {
          'x-authorization': self.apikey
        }
      }).on('success', function(data) {
        if (data.status === 'error'){
          return callback(data.msg);
        } else if (data.status === 'completed'){
          self.downloadUrl = data.download_url;

          return callback();
        } else {
          setTimeout(function() {
            console.log('Waiting for the job', data.job, '...');
            self.watchUpload(pollEvery, callback);
          }, pollEvery);
        }
      }).on('error', function(error) {
        return callback(error.code);
      });
    };

  /**
   * @description
   * Polls until the results can be downloaded. Uses the last uploaded status url (self.statusUrl).
   * The downloaded file name is just <job name>.zip .
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
      var newFile = self.statusUrl.split('/').pop(),
          fullLocation = location + '/' + newFile + '.zip',
          urlObj = url.parse(self.downloadUrl);

      http.get({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.path,
        headers: {
          'x-authorization': self.apikey
        }
      }, function(response) {
        self.handleServerDownloadError(response);

        var file = fs.createWriteStream(fullLocation);
        response.pipe(file);
        file.on('finish', function() {
          file.close(function() {
            if (!self.downloadError && removeAfter) {
              return self.remove(callback);
            }
            return callback(self.downloadError);
          });
        });
      }).on('error', function(err) {
        fs.unlink(fullLocation);
        callback(err);
      });
    });
  };

  /**
   * @description
   * Handles errors sent back from the server on file download by setting downloadError. These will
   * all be passed back as JSON, instead of a stream so handling them is non trivial.
   *
   * @param {response} response The response object returned from an http request.
   */
  self.handleServerDownloadError = function(response) {
    // If this is not done, one download error could stop all subsequent requests using this object.
    self.downloadError = null;

    response.on('data', function (chunk) {
      // Make sure that only small amounts of data will be parsed
      if(chunk.length < 200){
        try {
          var parsed = JSON.parse(chunk);
          if (parsed.error){
            self.downloadError = parsed.msg;
          }
        } catch(e){
          self.downloadError = e;
        }
      }
    });
  };

 /**
   * @description
   * Removes the last uploaded file from the server.
   *
   * @param {function(err="")} callback Called when the function completes or there is an error.
   */
  self.remove = function(callback) {
    rest.del(self.statusUrl, {
      headers: {
        'x-authorization': self.apikey
      }
    }).on('success', function(data) {
      return callback(data ? data.msg : undefined);// msg only occurs on error
    }).on('error', function(error) {
      return callback(error.code);
    });
  };

  return self;
};