# Ejemplo de Serverless SNS 

```bash
serverless create --template aws-nodejs --path serverless-sns-example
cd serverless-sns-example
git init
yarn init
yarn add aws-sdk
yarn add serverless-offline --dev
yarn add serverless-offline-sns --dev
yarn add serverless-plugin-optimize --dev
```