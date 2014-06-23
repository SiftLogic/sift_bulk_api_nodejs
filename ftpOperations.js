var JSFtp = require('jsftp');

/** 
 * Handles all FTP based operations across the system.
 * @class FtpOperations
 * @constructor
 *
 * @returns {Operations} Instantiated version of this class.
 */

module.exports = function() {
  var self = {
    JSFtp: JSFtp,// Make testing what is sent to this possible
    ftp: null
  };

  /**
   * Setups the ftp connection.
   * 
   * @param {Object} Has connection information.(username, key, host, port).
   **/
  self.init = function(opts) {
    self.ftp = new self.JSFtp({
      host: opts.host,
      port: opts.port,
      user: opts.username,
      pass: opts.password,
      debugMode: true
    });
  };

  return self;
};