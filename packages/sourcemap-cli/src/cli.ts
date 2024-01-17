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
  silent: {
    type: 'boolean',
    describe: 'Switches off informational console logging',
    default: false
  }
}).parseSync();

async function run(directory: string, organization: string, globPattern: string, hashAlgo: string, silent: boolean) : Promise<void>{
  const jsMapFiles = glob.sync(globPattern, { cwd: directory });
  
  if (jsMapFiles.length === 0) {
    fail(`No files found for pattern ${globPattern}`);
  }

  for (var jsMapFile of jsMapFiles) {
    const jsMapFilePath = path.join(directory, jsMapFile);
    if (!silent) {
      console.log(`Indexing ${jsMapFilePath}`);
    }
    await indexJsMapFileAsync(organization, hashAlgo, jsMapFilePath, silent);
  }
}

if (!argv.organization) {
  fail("Missing required option: 'organization'");
}

if (!fsExtra.pathExistsSync(argv.directory)) {
  fail(`Specified argument: 'folder' with value '${argv.directory}' does not exist.`);
}

run(argv.directory, argv.organization, argv.globPattern, argv.hashAlgo, argv.silent)
  .catch(err => fail(err));
