import * as chalk from 'chalk';
import * as fsExtra from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';
import * as yargs from 'yargs';

import { indexJsMapFileAsync } from 'azure-devops-symbols-sourcemap';

function fail(message: string): never {
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


async function run(directory: string, organization: string, globPattern: string, hashAlgo: string) : Promise<void>{
  const jsMapFiles = glob.sync(path.join(directory, globPattern));
  
  for (var jsMapFile of jsMapFiles) {
    await indexJsMapFileAsync(organization, hashAlgo, jsMapFile);
  }
}

if (!argv.organization) {
  fail("Missing required option: 'organization'");
}

if (!fsExtra.pathExistsSync(argv.directory)) {
  fail(`Specified argument: 'folder' with value '${argv.directory}' does not exist.`);
}

run(argv.directory, argv.organization, argv.globPattern, argv.hashAlgo)
  .catch(err => fail(err));
