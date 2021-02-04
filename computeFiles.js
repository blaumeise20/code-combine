const { readFileSync, existsSync } = require("fs");
const { join, dirname } = require("path");
const { transformSync } = require("@babel/core");
const { parse } = require("@babel/parser");

const walk = (syntax, list) => {
    if (syntax == null) return;
    if (syntax instanceof Array) {
        syntax.forEach(elem => {
            walk(elem, list);
        });
    }
    else if (typeof syntax == "object") {
        if (syntax.type == "CallExpression") {
            list.push(syntax);
        }
        for (const key in syntax) {
            if (syntax.hasOwnProperty(key)) {
                walk(syntax[key], list);
            }
        }
    }
};
const lookupRequirements = code => {
    const parsed = parse(code, { plugins: [] }).program.body;
    let list = [];
    walk(parsed, list);
    list = list.filter(call => call.callee.type == "Identifier" && call.callee.name == "require");
    list = list.map(call => {
        if (call.arguments[0].type == "StringLiteral" && typeof call.arguments[0].value == "string")
            return call.arguments[0].value;
        else
            throw new Error("Can only use literal strings as require paths!");
    });
    return list;
};

const arrayToKeys = array => {
    const result = {};
    for (const key of array) result[key] = null;
    return result;
};
const computeFile = (filename, files) => {
    if (!existsSync(filename))
        throw new Error(`Cannot find file '${filename}'`);
    if (!filename.startsWith(files.basedir + "/"))
        throw new Error(`File '${filename}' is not in the bound of main file`);

    const fileListEntry = {
        filename,
        code: "",
        requires: {}
    };
    files.list.push(fileListEntry);

    const code = readFileSync(filename);
    const transformedCode = transformSync(code, {
        parserOpts: { plugins: ["jsx", "classProperties", "classPrivateProperties"], sourceType: "module" },
        plugins: ["./transformJSX", "@babel/plugin-transform-modules-commonjs", "@babel/plugin-proposal-class-properties", "@babel/plugin-transform-classes"],
        //presets: ["@babel/preset-es2015"],
        cwd: __dirname
    }).code;
    const requirements = lookupRequirements(transformedCode);
    const requires = arrayToKeys(requirements);

    fileListEntry.code = transformedCode;
    fileListEntry.requires = requires;

    const fileDirname = dirname(filename);
    requirements.map(file => ({ correspondingPath: join(fileDirname, file), file }))
        .map(requirement => {
            if (!requirement.correspondingPath.endsWith(".js"))
                requirement.correspondingPath += ".js";
            return requirement;
        })
        .forEach(requirement => {
            if (requirement.correspondingPath in files.seenPaths) {
                requires[requirement.file] = files.seenPaths[requirement.correspondingPath];
                return;
            }
            else
                requires[requirement.file] = files.list.length;

            files.seenPaths[requirement.correspondingPath] = files.list.length;
            computeFile(requirement.correspondingPath, files);
        });
};

module.exports = computeFile;
