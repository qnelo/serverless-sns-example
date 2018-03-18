'use strict';

const sendMessage = (event, context, callback) => {

  const AWS = require('aws-sdk');
  const config = require('./config')(process.env.IS_OFFLINE);

  const snsConfig = process.env.IS_OFFLINE
    ? {
      endpoint: 'http://127.0.0.1:4002',
      region: config.region,
    }
    : {};

  const message = {
    body: JSON.stringify({ message: 'Ultra Test Message' })
  };

  const snsPublishConfig = {
    Message: message,
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
  // sns.publish({
  //   Message: 'Ultra Test Message',
  //   MessageStructure: 'json',
  //   TopicArn: 'arn:aws:sns:us-east-1:123456789012:sns-example-topic',
  // }, () => {
  //   const response = {
  //     statusCode: 200,
  //     body: JSON.stringify({
  //       message: 'message sent'
  //     }),
  //   };

  //   callback(null, response);
  // });
};

const getMessage = (event, context, callback) => {
  console.info('incoming message: ', event.Records[0].Sns.Message);
  callback(null, { response: 'message received' });
};

module.exports = {
  sendMessage,
  getMessage
}