import * as fsExtra from 'fs-extra';
import * as crypto from 'crypto';
import * as path from 'path';

/** 
 * The field to use in the javascript sourcemap file
 * The file format is extensible where 'x_' is reserved for extensions and it is recommended to use the company name.
 * See: https://sourcemaps.info/spec.html#h.ghqpj1ytqjbm
 */
export const sourceMapClientKeyField = "x_microsoft_symbol_client_key";

export function computeSourceMapUrlLine(organization: string, clientKey: string, sourceFileName: string) {
    return `\n//# sourceMappingURL=https://artifacts.dev.azure.com/${organization}/_apis/symbol/symsrv/${sourceFileName}/${clientKey}/${sourceFileName}`;
}

export function setClientKeyOnSourceMap(clientKey: string, sourceMap: any) {
    sourceMap[sourceMapClientKeyField] = clientKey;

    // We want the new field early in the json file so that the symbol uploader
    // does not need to parse the entire file and can be faster.
    // We do this by adding the field and then removing and readding the know large fields
    moveMemberToEnd(sourceMap, 'sources');
    moveMemberToEnd(sourceMap, 'names');
    moveMemberToEnd(sourceMap, 'mappings');
    moveMemberToEnd(sourceMap, 'sourcesContent');
}

function moveMemberToEnd(obj: any, field: string) : void {
    var value = obj[field];
    delete obj[field]
    obj[field] = value;
}

function hashFile(path: string) : Promise<string> {
    const sha256 = crypto.createHash("sha256")
                         .setEncoding("hex");

    return new Promise((resolve, reject) =>
        fsExtra.createReadStream(path)
               .on("error", reject)
               .pipe(sha256)
               .once("finish", function () {
                   resolve(sha256.read());
               })
    );
}

export async function indexJsMapFileAsync(organization: string, hashAlgo: string, jsMapFile: string, silent?: boolean) : Promise<void> {
    const log = silent ? () => {} : console.log;
    
    log(`Processing sourcemap file ${jsMapFile} for organization ${organization} with hash algorithm: ${hashAlgo}`);

    const sourceMap = await fsExtra.readJson(jsMapFile);
    if (!sourceMap.file) {
        throw new Error(`SourceMap ${jsMapFile} is missing field 'file'. This is required to stamp the .js.map files`);
    }

    const sourceFilePath = path.join(path.dirname(jsMapFile), sourceMap.file);
    if (!fsExtra.existsSync(sourceFilePath)) {
        throw new Error(`SourceMap ${jsMapFile} declares ${sourceMap.file} as the source file, but it does not exist.`);
    }

    // Compute hash of file:
    const clientKey = await hashFile(sourceFilePath);

    // Check for empty hash and fail
    if (clientKey === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
        throw new Error(`Source file ${sourceFilePath} has an empty hash. Something must have gone wrong..`);
    }

    // Update the sourcemap file.
    log(`    Updating sourcemap file with key ${clientKey}`);
    setClientKeyOnSourceMap(clientKey, sourceMap)
    await fsExtra.writeJSON(jsMapFile, sourceMap);

    log(`    Updating source file ${sourceFilePath}`);
    const sourceMapUrlComment = computeSourceMapUrlLine(organization, clientKey, path.basename(jsMapFile));
    await fsExtra.appendFile(sourceFilePath, sourceMapUrlComment);
}