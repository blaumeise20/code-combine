#!/usr/bin/env node

const { join, dirname, relative } = require("path");
const { existsSync, writeFileSync, watch } = require("fs");
const filesize = require("filesize");
const computeFile = require("./computeFiles");
const combineCode = require("./combineCode");

const cwd = process.cwd();
const configPath = join(cwd, process.argv.slice(2).join(" ") || "./combine.config.js");
let config;
if (existsSync(configPath))
    config = require(configPath);
else
    config = {};
config = { startFile: "./index.js", distFile: "./bundle.js", isDevelopment: false, ...config };

console.log(`\u001b[35;1m[INFO] Starting in ${config.isDevelopment ? "development" : "build"} mode.\u001b[0m`);

const combine = () => {
    console.log("\u001b[36;1m[BUILD]\u001b[0;3m Combining...\u001b[0m");
    const startFile = join(dirname(configPath), config.startFile);
    const files = { list: [], seenPaths: {}, basedir: dirname(startFile) };
    try {
        computeFile(startFile, files);
    }
    catch (err) {
        console.log(`\u001b[36;1m[BUILD] \u001b[0;31mERROR: ${err.stack.replace(/^\n+|\n+$/g, "")}\u001b[0m`);
        return { success: false, list: files.list };
    }

    const distPath = join(dirname(configPath), config.distFile);
    const distCode = combineCode(files.list);
    writeFileSync(distPath, distCode);
    console.log(`\u001b[36;1m[BUILD]\u001b[0;32m Successfully combined \u001b[1m${files.list.length} file${files.list.length == 1 ? "" : "s"}\u001b[0m`);
    console.log(`\u001b[36;1m[BUILD]\u001b[0m Output File: ${relative(cwd, distPath)}`);
    console.log(`\u001b[36;1m[BUILD]\u001b[0m File size: ${filesize(distCode.length)}`);

    return { success: true, list: files.list };
};

const deploy = async (buildSucceeded = true) => {
    if (config.deploy) {
        if (!buildSucceeded) return console.log("\u001b[36;1m[BUILD]\u001b[0;3m Not deploying because of failed combine\u001b[0m");
        let deployFunc;
        if (typeof config.deploy == "function")
            deployFunc = config.deploy;
        else {
            console.log("\u001b[36;1m[BUILD] \u001b[0;31mERROR: Deploy is not a function!\u001b[0m");
            return;
        }
        console.log("\u001b[36;1m[BUILD]\u001b[0;3m Deploying...\u001b[0m");
        try {
            const deployResult = deployFunc.call({
                ...config,
                log: text => console.log(`\u001b[36;1m[BUILD]\u001b[0m ${text}\u001b[0m`)
            });
            if (deployResult instanceof Promise) await deployResult;
            console.log(`\u001b[36;1m[BUILD]\u001b[0;32m Successfully deployed\u001b[0m`);
        } catch (err) {
            console.log(`\u001b[36;1m[BUILD] \u001b[0;31mERROR: ${err.stack.replace(/^\n+|\n+$/g, "")}\u001b[0m`);
        }
    }
};

let lastCombine = null;
const build = async () => {
    console.log();
    console.log("\u001b[36;1m[BUILD] Build started\u001b[0m");
    let combined;
    if (!(combined = combine()).success) {
        await deploy(false);
        console.log("\u001b[36;1m[BUILD] Build \u001b[31mfailed\u001b[0m");
        return lastCombine || combined.list;
    }
    await deploy();
    console.log("\u001b[36;1m[BUILD] Build \u001b[32msucceeded\u001b[0m");
    lastCombine = combined.list;
    return combined.list;
};

let watches = [];
let seenFiles = {};
const devBuild = async () => {
    watches.forEach(watcher => watcher.close());
    watches = [];

    const files = await build();
    files.forEach(file => {
        watches.push(watch(file.filename).once("change", () => {
            if (seenFiles[file.filename]) return;
            seenFiles[file.filename] = true;
            setTimeout(() => seenFiles[file.filename] = false, 4000);
            devBuild();
        }));
    });
};

const stop = async () => {
    watches.forEach(watcher => watcher.close());
    process.stdout.clearLine();
    if (typeof config.stop == "function") {
        console.log();
        await config.stop.call({
            ...config,
            log: text => console.log(`\u001b[33;1m[STOP]\u001b[0m ${text}\u001b[0m`)
        });
    }
};
if (config.isDevelopment) {
    process.on("SIGTERM", stop);
    process.on("SIGINT", stop);
    devBuild();
}
else {
    (async () => {
        await build();
        await stop();
    })();
}
