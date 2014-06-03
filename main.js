#!/bin/sh
':' //; exec "$(command -v nodejs || command -v node)" "$0" "$@"

'use strict';

/**
 * Demonstrates how the operations object can be used. It is better to require the operation.js file
 * your code directly for increased flexibility.
 * 1. Uploads the specified file in multifile mode (unless otherwise specified).
 * 2. Polls the server until the results are complete.
 * 3. Downloads the results to the specified location.
 **/
var argv = require('yargs')
  .usage('Usage: $0 -f [file name] -l [download location] -u [username] -p [password]')
  .example('$0 -f ../test.csv -l /tmp -u TestKey -p e261742d-fe2f-4569-95e6-312689d049 --poll 10', 
           'Upload test.csv, process it and download the results to /tmp, poll every 10s')
  .demand(['f', 'l', 'u', 'p'])
  .describe({
    f: 'The file path of the upload file',
    l: 'The location of where the results file should be placed',
    u: 'The username defined in the manage api keys section',
    p: 'The password defined in the manage api keys section',
    poll: 'The number of seconds to poll for (default 300)',
    host: 'The host to connect to (default localhost)',
    port: 'The port to connect to (default 21)',
    singleFile: 'Whether to run in single file mode (defaults to false)'
  })
  .argv;

var Operations = require('./operations');

// Once uploaded download the results and quit once done.
var operations = new Operations({
    username: argv.u,
    password: argv.p,
    host: argv.host,
    port: argv.port,
    polling: argv.poll,
  }).init();

operations.upload(argv.f, argv.singleFile, function(err) {
  if (err) {
    throw err;
  }
  console.log(argv.f, 'was uploaded.');

  operations.download(argv.l, function(err) {
    if (err) {
      throw err;
    }
    console.log('Downloaded into', argv.l + argv.f);

    // Always close the FTP connection properly once done with it.
    operations.quit(function(err) {
      if (err) {
        throw err;
      }
    });
  });
});