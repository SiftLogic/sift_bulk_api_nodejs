Node.js FTP APIs
================

This demonstrates how to connect to the ftp server with Node.js. You will need to know your apikey and password which can be found in the UI: API Keys -\> Manage -\> Actions -\> Access Details. Once you
have that you can try the main.js file for an upload demo. For example:
<pre>
  <code>
    ./main.js -f test.csv -l /tmp -u aUsername -p e261742d-fe2f-4569-95e6-312689d04903 --poll 10
  </code>
</pre>
The CLI is described in more detail with <code>./main.js</code>

It is recommended to require the operations file and use the functions in there to customize your process. The functions are described in file. If you want to cut down on code, this file only requires jsftp as a node module.

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
* **operations.js:** Object that controls server connections.
* **operations_test.js:** 100% code coverage unit tests of operations.js. It is recommended that you update this if you want to customize operations.js.
* **package.json:** Standard NPM specification file.
* **node_modules:** Standard location of project specific node libraries.
* **test.csv:** A small sample records file.