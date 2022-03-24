"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureDevOpsSymbolsPlugin = void 0;
const webpackSources = require("webpack-sources");
const path = require("path");
const azure_devops_symbols_sourcemap_1 = require("azure-devops-symbols-sourcemap");
//import { Compilation } from "webpack";
const crypto = require("crypto");
const pluginName = "AzureDevOpsSymbolsPlugin";
/**
 * This is the plugin version which is compatible with Webpack v4
 */
class AzureDevOpsSymbolsPlugin {
  constructor(options) {
    this.organization = "<Organization>";
    if (options) {
      this.organization = options.organization;
    }
  }
  apply(compiler) {
    const options = compiler.options;
    // If we don't have source-map as a dev-tool this plugin doesn't need to do anything
    if (!options.devtool || !options.devtool.includes("source-map")) {
      console.log(
        `${pluginName}: returning since there's no source-map devtool`
      );
      return;
    }
    const hidden = options.devtool.includes("hidden");
    if (!hidden) {
      throw new Error(
        `When using plugin ${pluginName} you must set 'hidden' on the 'devtool' settings to true. To avoid declaring two sourcemap comments.`
      );
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
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      // Register a hook just before CommonJsChunkFormatPlugin runs
      // and add field to the .js.map sourceMap file that contains the
      // symbol client key to which the Azure DevOps symbol upload task
      // should push the symbols.
      compilation.hooks.afterOptimizeAssets.tap(pluginName, (assets) => {
        for (const file of Object.keys(assets)) {
          let asset = compilation.assets[file];
          if (asset) {
            const sourceMap = asset.map(sourceMapOptions);
            if (sourceMap) {
              // Compute the hash of the sourcefile (before appending the sourceUrl comment)
              const hash = crypto.createHash(
                compilation.outputOptions.hashFunction || "md4"
              );
              asset.updateHash(hash);
              const clientKey = hash.digest("hex");
              console.log(
                `Tagging sourcemap with ${clientKey} to ${asset._name}`
              );
              // Add the sourcemap client id field to the sourcemap json object.
              (0, azure_devops_symbols_sourcemap_1.setClientKeyOnSourceMap)(
                clientKey,
                sourceMap
              );
              const sourceMapFileName = path.basename(file) + ".map";
              const sourceMapLineToAppend = (0,
              azure_devops_symbols_sourcemap_1.computeSourceMapUrlLine)(
                this.organization,
                clientKey,
                sourceMapFileName
              );
              const source = new webpackSources.SourceMapSource(
                asset.source(),
                asset._name,
                sourceMap,
                undefined,
                undefined,
                true
              );
              compilation.updateAsset(asset._name, source, (info) =>
                Object.assign(info, {
                  adoSourecMapEnabled: true,
                  related: {
                    sourceMapLineToAppend: sourceMapLineToAppend,
                    clientKey: clientKey,
                  },
                })
              );
              compilation.updateAsset(
                file,
                (source) =>
                  new webpackSources.ConcatSource(
                    source.toString(),
                    sourceMapLineToAppend
                  ),
                undefined
              );
              compilation.assets[file] = source;
            }
          }
        }
      });

      //   compilation.hooks.statsPrinter.tap(
      //     {
      //       name: pluginName,
      //     },
      //     (stats) => {
      //       const id = (x: string) => x;
      //       stats.hooks.print
      //         .for("asset.info.related.sourceMapLineToAppend")
      //         .tap(pluginName, (sourceMapLineToAppend, { cyan, formatFlag }) =>
      //           sourceMapLineToAppend
      //             ? (cyan || id)((formatFlag || id)("azure sourcemap"))
      //             : ""
      //         );
      //     }
      //   );
    });
  }
}
exports.AzureDevOpsSymbolsPlugin = AzureDevOpsSymbolsPlugin;
//# sourceMappingURL=plugin.js.map
