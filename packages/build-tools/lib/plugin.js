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
exports.AzureDevOpsSymbolsPlugin = void 0;
const webpack_sources_1 = require("webpack-sources");
const path = require("path");
const azure_devops_symbols_sourcemap_1 = require("azure-devops-symbols-sourcemap");
const pluginName = "AzureDevOpsSymbolsPlugin";
class AzureDevOpsSymbolsPlugin {
    constructor(options) {
        if (options) {
            this.organization = options.organization;
        }
    }
    apply(compiler) {
        // ensure proper runtime version of webpack is used below
        const { webpack, options } = compiler;
        // If we don't have source-map as a dev-tool this plugin doesn't need to do anything
        if (!options.devtool || !options.devtool.includes("source-map")) {
            return;
        }
        const hidden = options.devtool.includes("hidden");
        if (!hidden) {
            throw new Error(`When using plugin ${pluginName} you must set 'hidden' on the 'devtool' settings to true. To avoid declaring two sourcemap comments.`);
        }
        // The options we pass to extract the source map must match exactly what SourceMapDevToolPlugin
        // does internally, because else when we ask to get the sourcemap object we get a newly
        // computed one with differnt options, so when we add the extra fields, they won't be
        // in the final .js.map file
        const cheap = options.devtool.includes("cheap");
        const moduleMaps = options.devtool.includes("module");
        const sourceMapOptions = {
            module: moduleMaps ? true : cheap ? false : true,
            columns: cheap ? false : true,
        };
        compiler.hooks.compilation.tap(pluginName, compilation => {
            // Register a hook just before CommonJsChunkFormatPlugin runs
            // and add field to the .js.map sourceMap file that contains the 
            // symbol client key to which the Azure DevOps symbol upload task
            // should push the symbols.
            compilation.hooks.processAssets.tapPromise({
                name: pluginName,
                // This should run just before the CommonJsChunkFormatPlugin runs
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING - 1,
            }, (assets) => __awaiter(this, void 0, void 0, function* () {
                for (const file of Object.keys(assets)) {
                    let asset = compilation.getAsset(file);
                    if (asset) {
                        const sourceMap = asset.source.map(sourceMapOptions);
                        if (sourceMap) {
                            // Compute the hash of the sourcefile (before appending the sourceUrl comment)
                            const hash = compiler.webpack.util.createHash(compilation.outputOptions.hashFunction || "md4");
                            asset.source.updateHash(hash);
                            const clientKey = hash.digest("hex");
                            // Add the sourcemap client id field to the sourcemap json object.
                            sourceMap[azure_devops_symbols_sourcemap_1.sourceMapClientKeyField] = clientKey;
                            const sourceMapFileName = path.basename(file);
                            const sourceMapLineToAppend = azure_devops_symbols_sourcemap_1.computeSourceMapUrlLine(this.organization, clientKey, sourceMapFileName);
                            compilation.updateAsset(asset.name, x => x, (info) => Object.assign(info, { related: { sourceMapLineToAppend: sourceMapLineToAppend } }));
                        }
                    }
                }
            }));
            compilation.hooks.processAssets.tapPromise({
                name: pluginName,
                stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
                additionalAssets: true
            }, (assets) => __awaiter(this, void 0, void 0, function* () {
                for (const file of Object.keys(assets)) {
                    let asset = compilation.getAsset(file);
                    if (asset && asset.info.related && asset.info.related.sourceMapLineToAppend) {
                        console.log("Adding comment");
                        const content = asset.info.related.sourceMapLineToAppend;
                        compilation.updateAsset(file, ((source) => new webpack_sources_1.ConcatSource(source, content)), {});
                    }
                }
            }));
        });
    }
}
exports.AzureDevOpsSymbolsPlugin = AzureDevOpsSymbolsPlugin;
//# sourceMappingURL=plugin.js.map