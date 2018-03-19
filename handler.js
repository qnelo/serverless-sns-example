'use strict';

// config.js file must be like this
// module.exports = (offline) => {
//   return offline
//   ? {
//       awsAccountId: '123456789012',
//       region: 'us-east-1'
//   }
//   :{
//       awsAccountId: '098765432109', <- Real awsAccountId
//       region: 'us-east-1'
//   };
// }

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
      }
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
}