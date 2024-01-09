import * as webpackTypes from "webpack";
import * as webpackSources from "webpack-sources";
import * as path from "path";
import {
  computeSourceMapUrlLine,
  setClientKeyOnSourceMap,
} from "azure-devops-symbols-sourcemap";
const webpack = require("webpack");

const pluginName = "AzureDevOpsSymbolsPlugin";

export interface AzureDevOpsSymbolsPluginOptions {
  organization: string;
  // Using the Edge AzureDevOps PersonalAccessToken route. In this case the 'sourceMappingURL' isn't appended, and users must add their ADO PAT in Edge DevTools
  // See https://blogs.windows.com/msedgedev/2022/04/12/retrieve-source-maps-securely-in-production-in-microsoft-edge-devtools/
  useEdgePAT?: boolean;
  silent?: boolean;
}

/**
 * This is the plugin version which is compatible with Webpack v4
 */
export class AzureDevOpsSymbolsPlugin {
  organization: string = "<Organization>";
  useEdgePAT: boolean = false;
  silent: boolean = false;

  constructor(options?: AzureDevOpsSymbolsPluginOptions) {
    if (options) {
      this.organization = options.organization;
      this.useEdgePAT = !!options.useEdgePAT;
      this.silent = !!options.silent;
    }
  }

  private log(...args: Parameters<Console["log"]>): void {
    if (!this.silent) {
      console.log(...args);
    }
  }

  apply(compiler: webpackTypes.Compiler) {
    const options = compiler.options;
    // If we don't have source-map as a dev-tool this plugin doesn't need to do anything
    if (
      !options.devtool ||
      <any>options.devtool === true ||
      !options.devtool.includes("source-map")
    ) {
      this.log(
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
    // computed one with different options, so when we add the extra fields, they won't be
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
          const asset = compilation.getAsset(file);
          if (asset) {
            // @ts-ignore - this is correct for Webpack v4. There's a webpack-sources mismatch
            const sourceMap = asset.source.map(
              sourceMapOptions
            ) as webpackSources.SourceMapSource;

            // This will only pass for assets
            if (sourceMap) {
              // Compute the hash of the sourcefile (this is the hash before appending the sourceUrl comment, if appended)
              const hashFunc = this.useEdgePAT
                ? "sha256"
                : compilation.outputOptions.hashFunction || "md4";
              const hash = webpack.util.createHash(hashFunc);
              asset.source.updateHash(hash);
              const clientKey = <string>hash.digest("hex");

              this.log(
                `Tagging sourcemap with ${clientKey} to ${asset.name}`
              );

              // Add the sourcemap client id field to the sourcemap json object.
              setClientKeyOnSourceMap(clientKey, sourceMap);
              const sourceMapFileName = path.basename(file) + ".map";
              const sourceMapLineToAppend = computeSourceMapUrlLine(
                this.organization,
                clientKey,
                sourceMapFileName
              );
              const updatedSourceMapSource = new webpackSources.ConcatSource(
                // @ts-ignore is fine for Webpack v4...
                asset.source.source(),
                this.useEdgePAT ? "" : sourceMapLineToAppend
              );
              const assetWithClientKeyOnSourceMap =
                new webpackSources.SourceMapSource(
                  updatedSourceMapSource.source(),
                  asset.name,
                  // @ts-ignore is fine for Webpack v4...
                  sourceMap, // Note: For w/e reason this has no affect on the output .map file
                  undefined,
                  undefined,
                  true
                );

              const sourceMapAssetName = file + ".map";
              const actualSourceMapAsset =
                compilation.getAsset(sourceMapAssetName);
              if (actualSourceMapAsset) {
                // Update the asset (the .js file)
                compilation.updateAsset(
                  asset.name,
                  // @ts-ignore correct for Webpack v4...
                  assetWithClientKeyOnSourceMap,
                  undefined
                );

                // Add the sourcemap client id field to the sourcemap json object, and update the sourcemap
                const sourceMapData = JSON.parse(
                  // @ts-ignore - correct for Webpack v4...
                  actualSourceMapAsset.source.source()
                );
                setClientKeyOnSourceMap(clientKey, sourceMapData);

                compilation.updateAsset(
                  sourceMapAssetName,
                  // @ts-ignore - correct for Webpack v4...
                  new webpackSources.RawSource(JSON.stringify(sourceMapData))
                );
              }
            }
          }
        }
      });
    });
  }
}
