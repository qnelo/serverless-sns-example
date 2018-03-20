# Ejemplo de Serverless SNS 

Este repositorio es un ejemplo de como se realiza un proyecto con el framework serverless en NodeJS utilizando AWS SNS, permite tambien ejemplificar como probar las funciones en ambiente local.

## Creando el proyecto

Crear un nuevo proyecto serverless con NodeJS
```bash
serverless create --template aws-nodejs --path serverless-sns-example
cd serverless-sns-example
```

Iniciar git y crear package.json
```bash
git init
yarn init
```

Instalar las dependencias necesarias
```bash
yarn add aws-sdk
yarn add serverless-offline --dev
yarn add serverless-offline-sns --dev
yarn add serverless-plugin-optimize --dev
```

## Configrar el proyecto

### Configurar el archivo `serverless.yml`

```yml
service: serverless-sns-example

provider:
  name: aws
  runtime: nodejs6.10

  # Generar los permisos
  iamRoleStatements:
    - Effect: "Allow"
      Resource: "*"
      Action:
        - "sns:*"

# definiendo las funciones
functions:
  getMessage:
    handler: handler.getMessage
    # creacion y suscripcion al topico
    events:
      - sns: sns-example-topic
  sendMessage:
    handler: handler.sendMessage
    events:
      - http:
          path: sendMessage
          method: get

# lista de plugins
plugins:
  - serverless-offline
  - serverless-offline-sns
  - serverless-plugin-optimize

# configuracion personalizada de sns offline
custom:
  serverless-offline-sns:
    port: 4002
    debug: true 
```

### Modificación del archivo `handler.js`

```js
const sendMessage = (event, context, callback) => {

    const AWS = require('aws-sdk');
    const config = require('./config')(process.env.IS_OFFLINE);

    const snsConfig = process.env.IS_OFFLINE
        ? {
            endpoint: 'http://127.0.0.1:4002',
            region: config.region,
        }
        : {};

    const message = { message: 'Ultra Test Message' };

    const snsPublishConfig = {
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: 'json',
        TopicArn: `arn:aws:sns:${config.region}:${config.awsAccountId}:sns-example-topic`,
    };

    const sns = new AWS.SNS(snsConfig);
    const snsPublish = sns.publish(snsPublishConfig).promise();

    snsPublish.then(
        () => {
            const response = {
                statusCode: 200,
                body: JSON.stringify({ message: 'message sent' })
            };
            callback(null, response);
        }
    ).catch(
        err => {
            console.error('ERROR: ', err);
        }
    );
};

const getMessage = (event, context, callback) => {
    console.info('incoming message: ', event.Records[0].Sns.Message);
    callback(null, { response: 'message received' });
};

module.exports = {
    sendMessage,
    getMessage
};
```

### Creación del archivo `config.js`

Este archivo contiene la configuraciones

```js
module.exports = (offline) => {
  return offline
  ? {
      awsAccountId: '123456789012',
      region: 'us-east-1'
  }
  :{
      awsAccountId: '098765432109', // <- Real awsAccountId
      region: 'us-east-1'
  };
}
```

### Modificación del `package.json`

```json
{
  "name": "serverless-sns-example",
  "version": "1.0.0",
  "main": "handler.js",
  "author": "???",
  "license": "WTFPL",
  "scripts": {
    "offline": "sls offline start",
    "logs:send": "sls logs -f sendMessage -t",
    "logs:get": "sls logs -f getMessage -t",
    "send": "curl -i -H \"Accept: application/json\" -H \"Content-Type: application/json\" -X GET http://localhost:3000/sendMessage"
  },
  "devDependencies": {
    "serverless-offline": "^3.18.0",
    "serverless-offline-sns": "^0.35.0",
    "serverless-plugin-optimize": "^3.0.4-rc.1"
  },
  "plugins": [
    "serverless-plugin-sns"
  ],
  "dependencies": {
    "aws-sdk": "^2.211.0"
  }
}

```

## Probando el proyecto localmente

Ejecutar el proyecto con `yarn offline` permite 
```bash
$ yarn offline
$ sls offline start
Serverless: DEBUG[serverless-offline-sns]: starting plugin
Serverless: DEBUG[serverless-offline-sns]: listening on 127.0.0.1:4002
Serverless: DEBUG[serverless-offline-sns][server]: configuring route
Serverless: DEBUG[serverless-offline-sns][adapter]: using endpoint: 
...
Serverless: Starting Offline: dev/us-east-1.

Serverless: Routes for getMessage:
Serverless: (none)

Serverless: Routes for sendMessage:
Serverless: GET /sendMessage

Serverless: Offline listening on http://localhost:3000

```

En otra terminal ejecutar que
```bash
$ yarn send

$ curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://localhost:3000/sendMessage
HTTP/1.1 200 OK
Content-Type: application/json
cache-control: no-cache
content-length: 26
accept-ranges: bytes
Date: Tue, 20 Mar 2018 12:14:26 GMT
Connection: keep-alive

Done in 0.11s.

```