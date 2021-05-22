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

## 2. Upload symbols
You can use the standard [PublishSymbols](https://docs.microsoft.com/en-us/azure/devops/pipelines/artifacts/symbols?view=azure-devops) task to upload symbols.

> Note: This part is not yet implemented and we are working with the Azure DevOps team to get this incorporated

```yml
- task: PublishSymbols@2
  displayName: Publish symbols
  inputs:
    SearchPattern: "**/dist/*.js.map"
    SymbolServerType: TeamServices
```


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
