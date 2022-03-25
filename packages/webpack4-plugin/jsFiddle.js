"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureDevOpsSymbolsPlugin = void 0;
const webpackSources = require("webpack-sources");
const path = require("path");
const azure_devops_symbols_sourcemap_1 = require("azure-devops-symbols-sourcemap");
const webpack = require("webpack");
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
      compilation.hooks.afterOptimizeAssets.tap(
        {
          name: pluginName,
          // This should run just before the CommonJsChunkFormatPlugin runs
        },
        (assets) => {
          for (const file of Object.keys(assets)) {
            let asset = compilation.getAsset(file);
            if (asset) {
              const sourceMap = asset.source.map(sourceMapOptions);
              if (sourceMap) {
                // Compute the hash of the sourcefile (before appending the sourceUrl comment)
                const hash = crypto.createHash(
                  compilation.outputOptions.hashFunction || "md4"
                );
                asset.source.updateHash(hash);
                const clientKey = hash.digest("hex");
                console.log(
                  `Tagging sourcemap with ${clientKey} to ${asset.name}`
                );
                // Add the sourcemap client id field to the sourcemap json object
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
                const sourceWithMapLineAppended =
                  new webpackSources.ConcatSource(
                    asset.source.source(),
                    sourceMapLineToAppend
                  );
                const assetWithClientKeyOnSourceMap =
                  new webpackSources.SourceMapSource(
                    sourceWithMapLineAppended.source(),
                    asset.name,
                    sourceMap, // Note: this seems to have no affect on the output .map file
                    undefined,
                    undefined,
                    true
                  );
                compilation.updateAsset(
                  asset.name,
                  assetWithClientKeyOnSourceMap,
                  undefined
                );

                // Update the sourcemap with the metadata
                // No idea why updating the source map associated with the actual .js file has no effect - I'd think it would
                const sourceMapAssetName = file + ".map";
                const actualSourceMapAsset =
                  compilation.getAsset(sourceMapAssetName);
                const actualSource = JSON.parse(
                  actualSourceMapAsset.source.source()
                );
                if (actualSourceMapAsset) {
                  // Add the sourcemap client id field to the sourcemap json object.
                  (0, azure_devops_symbols_sourcemap_1.setClientKeyOnSourceMap)(
                    clientKey,
                    actualSource
                  );
                  //
                  compilation.updateAsset(
                    sourceMapAssetName,
                    new webpackSources.RawSource(JSON.stringify(actualSource))
                  );
                }
              }
            }
          }
        }
      );

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
