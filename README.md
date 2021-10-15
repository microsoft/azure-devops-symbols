# azure-devops-symbols

This repository contains tools and utilities for JavaScript projects to produce
SourceMap files that can be uploaded to Azure DevOps Symbol server using the
`PublishSymbols` task.

You configure your javascript build to 'stamp' or 'index' the .js files with a URL to the sourcemap from the azure devops symbol server and update the .js.map files to contain the unique client key of the symbol server url.

## 1. Stamping the sourcemaps
### Stamp with WebPack
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

### Stamp using Script
If you don't use webpack you can add an extra step in your pipeline by using the cli tool:

```yml
- script: |
    npx azure-devops-symbols-sourcemap-cli --organization contoso
  displayName: Stamp js sourcemaps
```
You have to configure the name of the organization to match. In the example above your azure devops url would be: `https://dev.azure.com/contoso`

### Do it yourself
Both the two approaches above are helpers for a relatively simple process.

#### Add sourcemap link to the .js file
The `sample.js` file needs to have the sourcemap comment added at the end of the file with the following format.
```
//# sourceMappingURL=https://artifacts.dev.azure.com/<myProject>/_apis/symbol/symsrv/<sourcemapFileName>/<uniqueId>/<sourcemapFileName>
```
You'll have to replace `<myproject>` with the name of your project i.e. microsoft in the case of https://dev.azure.com/microsoft or https://microsoft.visualstudio.com.
`<sourcemapFileName> ` is the name of the sourcemap file i.e. `sample.js.map`.
`<uniqueId>` must be a unique id and it is up to you to choose a good value. A recommendation would be to hash the source file to have a deterministic build output.
If that is not a concern for you you could also just create a new GUID/UUID. 
In the cases mentioned above, the WebPack plugin relies on the internal hash that webpack computes and the cli script computes the sha256 content hash of the javascript file.

for example:
```
//# sourceMappingURL=https://artifacts.dev.azure.com/microsoft/_apis/symbol/symsrv/sample.js.map/583f03be-8580-4934-bb55-d3d0460a7921/sample.js.map
```

#### Declare the unique in the sourcemap
To support the symbol uploader to do the linking we'll have to add the `<uniqueId>` value computed for the .js file in the json file of the sourcemap.
To match the example you will have to add the following top-level field to `sample.js.map` json file.
```
"x_microsoft_symbol_client_key":"583f03be-8580-4934-bb55-d3d0460a7921",
```

## 2. Uploading symbols
You can use the standard [PublishSymbols](https://docs.microsoft.com/en-us/azure/devops/pipelines/artifacts/symbols?view=azure-devops) task to upload symbols.

> Note: This part is implmemented (#15259)[https://github.com/microsoft/azure-pipelines-tasks/pull/15259] but not yet fully deployed. We are working with the Azure DevOps team to get this rolled out to production.

When deployed the following yaml will 
```yml
- task: PublishSymbols@2
  displayName: Publish symbols
  inputs:
    SearchPattern: "**/dist/*.js.map"
    SymbolServerType: TeamServices
    IndexableFileFormats: SourceMap
```
> Note: The PublishSymbols task only rusn on Windows VM's so if your build runs on unix or mac, you'll have to publish the sourcemap (.js.map) files to a pipeline artifact and add an extra job to your pipeline to pull those and then call this task on a windows vm.

### In the mean time...
Since the backend has been deployed already you can enable sourcemaps by setting an evironment variable in the pipline instead of passing the flag to the task.
```yml
variables:
  - name: ArtifactServices.Symbol.IndexableFileFormats
    value: SourceMap
```
and ommit the `IndexableFileFormats` field from the `PublishSymbols` task.
> Disclaimer: This environment variable will be removed as soon as the task supports the extra field.

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
