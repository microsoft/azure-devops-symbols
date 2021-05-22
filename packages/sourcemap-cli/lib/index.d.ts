export declare const sourceMapClientKeyField = "x_microsoft_symbol_client_key";
export declare function computeSourceMapUrlLine(organization: string, clientKey: string, sourceFileName: string): string;
export declare function setClientKeyOnSourceMap(clientKey: string, sourceMap: any): void;
export declare function indexJsMapFileAsync(organization: string, hashAlgo: string, jsMapFile: string): Promise<void>;
