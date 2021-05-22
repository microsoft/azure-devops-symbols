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

export async function indexJsMapFileAsync(organization: string, hashAlgo: string, jsMapFile: string) : Promise<void> {
    console.log(`Processing sourcemap file ${jsMapFile}`);

    const sourceMap = await fsExtra.readJson(jsMapFile);
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
    setClientKeyOnSourceMap(clientKey, sourceMap)
    await fsExtra.writeJSON(jsMapFile, sourceMap);

    console.log(`    Updating source file ${sourceFilePath}`);
    const sourceMapUrlComment = computeSourceMapUrlLine(organization, clientKey, path.basename(sourceFilePath));
    await fsExtra.appendFile(sourceFilePath, sourceMapUrlComment);
}