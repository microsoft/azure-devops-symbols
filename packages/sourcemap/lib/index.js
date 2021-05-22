"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexJsMapFileAsync = exports.setClientKeyOnSourceMap = exports.computeSourceMapUrlLine = exports.sourceMapClientKeyField = void 0;
const fsExtra = require("fs-extra");
const crypto = require("crypto");
const path = require("path");
exports.sourceMapClientKeyField = "x_microsoft_symbol_client_key";
function computeSourceMapUrlLine(organization, clientKey, sourceFileName) {
    return `\n//# sourceMappingURL=https://artifacts.dev.azure.com/${organization}/_apis/symbol/symsrv/${sourceFileName}/${clientKey}/${sourceFileName}`;
}
exports.computeSourceMapUrlLine = computeSourceMapUrlLine;
function setClientKeyOnSourceMap(clientKey, sourceMap) {
    sourceMap[exports.sourceMapClientKeyField] = clientKey;
    // We want the new field early in the json file so that the symbol uploader
    // does not need to parse the entire file and can be faster.
    // We do this by adding the field and then removing and readding the know large fields
    moveMemberToEnd(sourceMap, 'sources');
    moveMemberToEnd(sourceMap, 'names');
    moveMemberToEnd(sourceMap, 'mappings');
    moveMemberToEnd(sourceMap, 'sourcesContent');
}
exports.setClientKeyOnSourceMap = setClientKeyOnSourceMap;
function moveMemberToEnd(obj, field) {
    var value = obj[field];
    delete obj[field];
    obj[field] = value;
}
function indexJsMapFileAsync(organization, hashAlgo, jsMapFile) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Processing sourcemap file ${jsMapFile}`);
        const sourceMap = yield fsExtra.readJson(jsMapFile);
        if (!sourceMap.file) {
            throw new Error(`SourceMap ${jsMapFile} is missing field 'file'. This is required to stamp the .js.map files`);
        }
        const sourceFilePath = path.join(path.dirname(jsMapFile), sourceMap.file);
        if (!fsExtra.existsSync(sourceFilePath)) {
            throw new Error(`SourceMap ${jsMapFile} declares ${sourceMap.file} as the source file, but it does not exist.`);
        }
        // Compute hash of file:
        const readStream = fsExtra.createReadStream(sourceFilePath);
        var hash = crypto.createHash(hashAlgo);
        readStream.pipe(hash);
        const clientKey = hash.digest("hex");
        // Update the sourcemap file.
        console.log(`    Updating sourcemap file with key ${clientKey}`);
        setClientKeyOnSourceMap(clientKey, sourceMap);
        yield fsExtra.writeJSON(jsMapFile, sourceMap);
        console.log(`    Updating source file ${sourceFilePath}`);
        const sourceMapUrlComment = computeSourceMapUrlLine(organization, clientKey, path.basename(sourceFilePath));
        yield fsExtra.appendFile(sourceFilePath, sourceMapUrlComment);
    });
}
exports.indexJsMapFileAsync = indexJsMapFileAsync;
//# sourceMappingURL=index.js.map