Node.js Bulk API
================

This demonstrates how to connect to the bulk server with Node.js. Currently, HTTP and FTP are supported for connections. Unlike FTP, HTTP requires no username just the password (auth token). The apikey and password/auth token are found in the UI: API Keys -\> Manage -\> Actions -\> Access Details. Once you
have that you can try the main.js file for an upload demo. For example:
<pre>
  <code>
    ./main.js -f test.csv -l /tmp --u aUsername -p e261742d-fe2f-4569-95e6-312689d04903 --poll 10
  </code>
</pre>
The CLI is described in more detail with <code>./main.js</code>

It is recommended to require the operations file and use the functions in there to customize your process. The functions are described in file.

Licensing
=========

Copyright 2014 SiftLogic LLC

SiftLogic LLC hereby grants to SiftLogic Customers a revocable, non-exclusive, non-transferable, limited license for use of SiftLogic sample code for the sole purpose of integration with the SiftLogic platform.

Installation
============
Make sure Node.js \>= <b>0.9.12</b> is installed as well as [NPM](https://www.npmjs.org/), then: 
<pre>
  <code>
    npm install
  </code>
</pre>

If you want to run the tests (<code>npm test</code>) or (<code>mocha test</code>):

<pre>
  <code>
    npm install -g mocha
  </code>
</pre>

Files And Folders
=================
* **main.js:** Example CLI that uploads a file, polls for it to complete, then downloads it.
* **operations.js:** Object that interfaces with server connection modes.
* **ftpOperations.js:** Object that provides an FTP interface to the server.
* **httpOperations.js:** Object that provides an HTTP interface to the server.
* **\*Test.js:** 100% code coverage unit tests of API functionality. It is recommended that you update these if you want to customize operations.js.
* **package.json:** Standard NPM specification file.
* **node_modules:** Standard location of project specific node libraries.
* **test.csv:** A small sample records file.
