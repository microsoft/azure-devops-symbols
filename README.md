# azure-devops-symbols

Enable seemless debugging of your JavaScript code regardless of how you distribute your code. 
The tools in this repo will allow you to store the SourceMap _(.js.map)_ file in Azure DevOps 
where it is safely stored and ready for use by our debuggers.

This repository contains tools and utilities for JavaScript projects to produce
SourceMap files that can be uploaded to Azure DevOps Symbol server using the
`PublishSymbols` task.

There are 2 flavors:
- With `sourceMappingUrl` stamping:\
You configure your javascript build to 'stamp' or 'index' the .js files with a URL to the sourcemap from the azure devops symbol server, and update the .js.map files to contain the unique client key of the symbol server url.
For access to the source maps developers will need to be logged in at your Azure Devops URL, for example https://dev.azure.com/contoso
- Without `sourceMappingUrl` stamping:\
Only the .js.map files are stamped with a unique client key (which must be the SHA-256 hash of the corresponding .js file), which will be used in the "Uploading Symbols" step.
For access to the source maps developers must use Edge and manually add an AzureDevOps PAT (PersonalAccessToken) under the DevTools 'Symbol Server' setting, as described in [Securely debug original code by using Azure Artifacts symbol server source maps](https://docs.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/javascript/consume-source-maps-from-azure) or [Retrieve source maps securely in production in Microsoft Edge DevTools](https://blogs.windows.com/msedgedev/2022/04/12/retrieve-source-maps-securely-in-production-in-microsoft-edge-devtools/)
Edge will automatically compute the SHA-256 hash of a script and use it as the index to search the in the orginization's ADO artifacts.

## 1. Stamping the sourcemaps
### option a) Stamp with WebPack
If your project uses webpack, configuring this is pretty easy.
Add the following to your `webpack.config.js` file:
```js
const { AzureDevOpsSymbolsPlugin } = require('azure-devops-symbols-webpack-plugin');

...

module.exports = {
    ...
    plugins: [
        ...

        new AzureDevOpsSymbolsPlugin({
            organization: "contoso"
        })
    ],
    ...
};
```
You have to configure the name of the organization to match. In the example above your azure devops url would be: `https://dev.azure.com/contoso`

The default configuration will stamp `sourceMappingUrl` on the .js scripts.
If you want to use the non-stamping flavor, pass `useEdgePAT: true`:
```js
new AzureDevOpsSymbolsPlugin({
    organization: "contoso",
    useEdgePAT: true
})
```

#### Webpack v4 compatible plugin
For Webpack v4, you'd do the same as above but use
```js
const { AzureDevOpsSymbolsPlugin } = require('azure-devops-symbols-webpack4-plugin');
```

> Note: the plugin doesn't work when combined with the Webpack v4-compatible [webpack-subresource-integrity](https://www.npmjs.com/package/webpack-subresource-integrity) plugin.

### option b) Stamp using cli script
If you don't use webpack you can add an extra step in your pipeline by using the cli tool:

```yml
- script: |
    npx azure-devops-symbols-sourcemap-cli --organization contoso
  displayName: Stamp js sourcemaps
```
You have to configure the name of the organization to match. In the example above your azure devops url would be: `https://dev.azure.com/contoso`

### option c) Do it yourself
Both the two approaches above are helpers for a relatively simple process.

Step 1. **Add sourcemap link to the .js file** (only needed for the `sourceMappingUrl`-stamping flavor)

The `sample.js` file needs to have the sourcemap comment added at the end of the file with the following format.
```
//# sourceMappingURL=https://artifacts.dev.azure.com/<myProject>/_apis/symbol/symsrv/<sourcemapFileName>/<uniqueId>/<sourcemapFileName>
```
You'll have to replace `<myproject>` with the name of your project i.e. contoso in the case of https://dev.azure.com/contoso or https://contoso.visualstudio.com.

`<sourcemapFileName> ` is the name of the sourcemap file i.e. `sample.js.map`.

`<uniqueId>` must be a unique id and it is up to you to choose a good value.\
A recommendation would be to hash the source file to have a deterministic build output.
If that is not a concern for you you could also just create a new GUID/UUID.
In the cases mentioned above, the WebPack plugin relies on the internal hash that webpack computes and the cli script computes the sha256 content hash of the Javascript file.

for example:
```
//# sourceMappingURL=https://artifacts.dev.azure.com/contoso/_apis/symbol/symsrv/sample.js.map/583f03be-8580-4934-bb55-d3d0460a7921/sample.js.map
```

Step 2. **Declare the unique in the sourcemap**

To support the symbol uploader to do the linking we'll have to add the `<uniqueId>` value computed for the .js file in the json file of the sourcemap.
To match the example you will have to add the following top-level field to `sample.js.map` json file.
```
"x_microsoft_symbol_client_key":"583f03be-8580-4934-bb55-d3d0460a7921",
```

> Reminder: for the no-`sourceMappingUrl`-stamping flavor, the <uniqueId> must be a SHA-256 hash of the Javascript file's content.

## 2. Uploading symbols
You can use the standard [PublishSymbols](https://docs.microsoft.com/en-us/azure/devops/pipelines/artifacts/symbols?view=azure-devops) task to upload symbols.

All you need is to add this yaml to your pipeline, you might have to update the SearchPattern to math your layout.
```yml
- task: PublishSymbols@2
  displayName: Publish symbols
  inputs:
    SearchPattern: "**/dist/*.js.map"
    SymbolServerType: TeamServices
    IndexableFileFormats: SourceMap
```
> Note: The PublishSymbols task only runs on Windows VM's so if your build runs on unix or mac, you'll have to publish the sourcemap (.js.map) files to a pipeline artifact and add an extra job to your pipeline to pull those and then call this task on a windows vm.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft 
trademarks or logos is subject to and must follow 
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
