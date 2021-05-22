import * as webpackTypes from "webpack";
export interface AzureDevOpsSymbolsPluginOptions {
    organization: string;
}
export declare class AzureDevOpsSymbolsPlugin {
    organization: string;
    constructor(options?: AzureDevOpsSymbolsPluginOptions);
    apply(compiler: webpackTypes.Compiler): void;
}
