# Prueba de fork
# Ejemplo de Serverless SNS

Este repositorio es un ejemplo de cómo se realiza un proyecto con el framework serverless en NodeJS utilizando AWS SNS, permite también ejemplificar cómo ejecutar las funciones en ambiente local.

## Creando el proyecto

### Crear un nuevo proyecto serverless con NodeJS
```bash
serverless create --template aws-nodejs --path serverless-sns-example
cd serverless-sns-example
```

### Iniciar git y crear package.json
```bash
git init
yarn init
```

### Instalar las dependencias necesarias

El paquete `aws-sdk` sirve para interactuar con todos los recursos que provee AWS.

El plugin `serverless-offline` sirve para ejecutar funciones lambda en ambiente de desarrollo.
El plugin `serverless-offline-sns` sirve para levantar un SNS localmente.

El plugin `serverless-plugin-optimize` empaqueta con Browserify, transpila con Babel y minifica el proyecto NodeJS.

```bash
yarn add aws-sdk
yarn add serverless-offline --dev
yarn add serverless-offline-sns --dev
yarn add serverless-plugin-optimize --dev
```

## Configurar el proyecto

### Configurar el archivo `serverless.yml`

```yml
service: serverless-sns-example

provider:
  name: aws
  runtime: nodejs6.10

  # Configuración para generar los permisos
  iamRoleStatements:
    - Effect: "Allow"
      Resource: "*"
      Action:
        - "sns:*"

# Definiendo las funciones
functions:
  getMessage:
    handler: handler.getMessage
    # Creacion y suscripcion al topico
    events:
      - sns: sns-example-topic
  sendMessage:
    handler: handler.sendMessage
    events:
      - http:
          path: sendMessage
          method: get

# Lista de plugins
plugins:
  - serverless-offline
  - serverless-offline-sns
  - serverless-plugin-optimize

# Configuración personalizada de sns offline
custom:
  serverless-offline-sns:
    port: 4002
    debug: true 
```

### Modificación del archivo `handler.js`

```js
// Función lambda que enviará un mensaje al topico SNS
const sendMessage = (event, context, callback) => {

    const AWS = require('aws-sdk');
    const config = require('./config')(process.env.IS_OFFLINE);

    // Comprueba si se esta ejecutando con el plugin serverless-offline
    // y sobre escribe la configuración del endpoint SNS
    const snsConfig = process.env.IS_OFFLINE
        ? {
            endpoint: 'http://127.0.0.1:4002',
            region: config.region,
        }
        : {};

    // Mensaje que se enviará
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

// Función lambda que recibirá mensajes desde el topico SNS
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

Este archivo contiene la configuraciones para conectar el SDK con AWS

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

Ejecutar el proyecto con `yarn offline` permite correr las funciones lambda en la máquina local y correr un SNS local.

```bash
$ yarn offline
sls offline start
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

Para corroborar que el proyecto está funcionando correctamente, en otra terminal ejecutamos `yarn send`, este script enviará una petición get a la función lambda que expone un evento http y que al ser llamado envía un mensaje al tópico SNS `sns-example-topic` al que esta suscrito la función lambda `getMessage`.


```bash
$ yarn send

curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://localhost:3000/sendMessage
HTTP/1.1 200 OK
Content-Type: application/json
cache-control: no-cache
content-length: 26
accept-ranges: bytes
Date: Tue, 20 Mar 2018 12:14:26 GMT
Connection: keep-alive

Done in 0.11s.

```

La lambda `getMessage` escribe en consola el mensaje recibido y puede verse en la salida de la ejecución del comando `yarn offline`.

```bash
Serverless: Offline listening on http://localhost:3000

Serverless: GET /sendMessage (λ: sendMessage)
Serverless: The first request might take a few extra seconds
Serverless: DEBUG[serverless-offline-sns][server]: hello request
...
Serverless: DEBUG[serverless-offline-sns][adapter]: calling fn: serverless-sns-example-dev-getMessage 1
Serverless: DEBUG[serverless-offline-sns]: /home/qnelo/Workspace/private/serverless-sns-example
Serverless: DEBUG[serverless-offline-sns]: require(/home/qnelo/Workspace/private/serverless-sns-example/handler)[getMessage]

incoming message:  {"default":"{\"message\":\"Ultra Test Message\"}"}

Serverless: DEBUG[serverless-offline-sns][server]: [object Object]

```

## Probando el proyecto en AWS

La última comprobación, pero no menos importante, es que funcione en AWS nuestras lambda y nuestro tópico SNS. Para ello se ejecuta el comando `sls deploy`.

Más informacion sobre el comando, stages, regiones, etc, en los siguintes links: [deploying](https://serverless.com/framework/docs/providers/aws/guide/deploying/) y [cli-reference](https://serverless.com/framework/docs/providers/aws/cli-reference/deploy/)


```
$ sls deploy
Serverless: Optimize: starting engines
Serverless: Optimize: serverless-sns-example-dev-getMessage
Serverless: Optimize: serverless-sns-example-dev-sendMessage
Serverless: Packaging service...
Serverless: Excluding development dependencies...
Serverless: Creating Stack...
Serverless: Checking Stack create progress...
.....
Serverless: Stack create finished...
Serverless: Uploading CloudFormation file to S3...
Serverless: Uploading artifacts...
Serverless: Uploading service .zip file to S3 (2.19 KB)...
Serverless: Validating template...
Serverless: Updating Stack...
Serverless: Checking Stack update progress...
.............................................
Serverless: Stack update finished...
Service Information
service: serverless-sns-example
stage: dev
region: us-east-1
stack: serverless-sns-example-dev
api keys:
  None
endpoints:
  GET - https://???.execute-api.us-east-1.amazonaws.com/dev/sendMessage
functions:
  getMessage: serverless-sns-example-dev-getMessage
  sendMessage: serverless-sns-example-dev-sendMessage

```

Una vez que las funciones lambda estén instaladas, se puede probar que se ejecuten correctamente. Dado que la función `sendMessage` expone un evento GET, se puede ejecutar la función ingresando la URL que el comando `sls deploy` entrega o ejecutando un comando `curl` como el siguiente:

```
$ curl -i -H \"Accept: application/json\" -H \"Content-Type: application/json\" -X GET https://???.execute-api.us-east-1.amazonaws.com/dev/sendMessage
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 26
Connection: keep-alive
Date: Thu, 22 Mar 2018 12:21:34 GMT
x-amzn-RequestId: 8fb19160-2dcb-11e8-9ba2-b348d7b3c520
X-Amzn-Trace-Id: sampled=0;root=1-5ab39fce-2ab5ca4863e599fd7f96ef3f
X-Cache: Miss from cloudfront
Via: 1.1 6072d8e50a1262c0708c4232ce29bde4.cloudfront.net (CloudFront)
X-Amz-Cf-Id: CQ9HkHBFmPJjg6AqTIu2OuOQce_NNVMDu0Q1Fw2PQ3qPS4YAMRJubQ==

{"message":"message sent"}
```

El script `yarn logs:send` definido en el archivo `package.json` permite ver los logs de ejecución de la función `sendMessage`.

```
$ yarn logs:send
yarn run v1.5.1
sls logs -f sendMessage -t
START RequestId: 2147e205-2dcb-11e8-a62a-d9b374fb6aa3 Version: $LATEST
END RequestId: 2147e205-2dcb-11e8-a62a-d9b374fb6aa3
REPORT RequestId: 2147e205-2dcb-11e8-a62a-d9b374fb6aa3	Duration: 700.39 ms	Billed Duration: 800 ms 	Memory Size: 1024 MB	Max Memory Used: 40 MB	

```

El script `yarn logs:get`, también definido en el archivo `package.json` permite ver los logs de ejecución de la función `getMessage`. Si todo funciona correctamente, se podrá ver que el mensaje `message:  {"message":"Ultra Test Message"}` enviado desde la función lambda `sendMessage`.

```
$ yarn logs:get 
yarn run v1.5.1
sls logs -f getMessage -t
START RequestId: 21e2c238-2dcb-11e8-9d03-0b03f48178e2 Version: $LATEST
2018-03-22 09:18:30.841 (-03:00)	21e2c238-2dcb-11e8-9d03-0b03f48178e2	incoming message:  {"message":"Ultra Test Message"}
END RequestId: 21e2c238-2dcb-11e8-9d03-0b03f48178e2
REPORT RequestId: 21e2c238-2dcb-11e8-9d03-0b03f48178e2	Duration: 2.61 ms	Billed Duration: 100 ms 	Memory Size: 1024 MB	Max Memory Used: 20 MB	
```

borrar esto