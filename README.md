# Code-combine

This is a small tool like webpack which combines JavaScript files into one single.

## Installation

Install this package globally:
```
npm install -g code-combine
```
Or if you only need it for one project, you can also install it as a dev-dependency:
```
npm install --save-dev code-combine
```

## Usage

Using it is really simple. Go to the directory with the config or provide a path to a configuration.
```
combine [optional path to config]
```

## Config

Profide a configuration in combine.config.js like this:

```js
module.exports = {
	startFile: "./src/index.js", // entry file
    distFile: "./dist/script.js", // output file
	isDevelopment: true, // if it should watch file changes
	async deploy() {
        // do something when compiling is done
        // you can access other properties of config here
        // for example this.distFile

        // call this.log("message") for debug output
	},
	async stop() {
        // do something when the process exits
        // you can also access other properties of config here

        // this.log is also available here
	}
};
```
The deploy and stop methods are really useful for uploading somthing onto a server. Here is an example with ssh2-sftp-client:
```js
const Client = require("ssh2-sftp-client");
const { join } = require("path");

const sftp = new Client();
const connected = sftp.connect(require("./sftp"));
let isConnected = false;

module.exports = {
	startFile: "./src/index.js",
	distFileAbs: join(__dirname, "./dist/script.js"),
	distFile: "./dist/script.js",
	isDevelopment: true,
	async deploy() {
		if (!isConnected) {
			try {
				await connected;
				isConnected = true;
			}
			catch (err) { throw err; }
		}

		await sftp.fastPut(this.distFileAbs, "/path/to/your/server/script.js");
	},
	async stop() {
		this.log("Exiting");
		if (isConnected) await sftp.end();
		process.exit(0);
	}
};
```
Read the documentation of the module for more info about connecting to a server
