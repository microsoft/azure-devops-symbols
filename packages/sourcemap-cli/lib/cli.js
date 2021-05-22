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
const chalk = require("chalk");
const fsExtra = require("fs-extra");
const glob = require("glob");
const path = require("path");
const yargs = require("yargs");
const azure_devops_symbols_sourcemap_1 = require("azure-devops-symbols-sourcemap");
function fail(message) {
    console.error(chalk.red(message));
    process.exit(1);
}
const argv = yargs.options({
    organization: {
        type: 'string',
        describe: 'Name of the azure devops organization. i.e. MyOrg if the url is https://dev.azure.com/MyOrg',
    },
    directory: {
        type: 'string',
        describe: 'Directory where to find .js.map files',
        default: '.'
    },
    globPattern: {
        type: 'string',
        describe: 'File pattern to update',
        default: '*.js.map'
    },
    hashAlgo: {
        type: 'string',
        describe: 'The hash algorithm to use of the original source file. Valid values are algorithms of https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm_options',
        default: 'sha256'
    },
}).argv;
function run(directory, organization, globPattern, hashAlgo) {
    return __awaiter(this, void 0, void 0, function* () {
        const jsMapFiles = glob.sync(path.join(directory, globPattern));
        for (var jsMapFile of jsMapFiles) {
            yield azure_devops_symbols_sourcemap_1.indexJsMapFileAsync(organization, hashAlgo, jsMapFile);
        }
    });
}
if (!argv.organization) {
    fail("Missing required option: 'organization'");
}
if (!fsExtra.pathExistsSync(argv.directory)) {
    fail(`Specified argument: 'folder' with value '${argv.directory}' does not exist.`);
}
run(argv.directory, argv.organization, argv.globPattern, argv.hashAlgo)
    .catch(err => fail(err));
//# sourceMappingURL=cli.js.map