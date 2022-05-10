	
const AWS = require('aws-sdk'); 
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { retrieveOutstandingCases, getOicEmails } = require('./retrieveOutstandingCases');
const { sendEmail } = require('./sendEmail');
dayjs.extend(customParseFormat)

AWS.config.update({region: 'ap-southeast-1'});

async function acknowledge(responses) {
  const response = responses.responses
  const submission_id = response.find(x=>x._id=='627a1f7e1d1bed00124b7c4d').answer
  let station;
  let incident_number;

  const docClient = new AWS.DynamoDB.DocumentClient();
  const paramsQuery = {
    ExpressionAttributeValues: {
    ':s': submission_id
    },
  KeyConditionExpression: 'submission_id = :s',
  TableName: 'form-notification'
  };

  try {
    const results = await docClient.query(paramsQuery).promise();
    station = results.Items[0].station
    incident_number = results.Items[0].incident_number
  } catch (err) {
    console.error(err)
  }

  const paramsDelete = {
      TableName: 'form-notification',
      Key: {
        'submission_id': response.find(x=>x._id=='627a1f7e1d1bed00124b7c4d').answer
      }
    };
    try {
      const results = await docClient.delete(paramsDelete).promise();
    } catch (err) {
        console.error(err)
    }

  const oic_emails = await getOicEmails(station)
  const oic_email_list = oic_emails.split(';')
  const html_table = await retrieveOutstandingCases(station)
  
  for (i in oic_email_list){
    const body = {
      "subject": `Acknowledged Heartsave submission ${incident_number}`,
      "body": `<p>Dear OICs,</p>
      <br>
      Thank you for submitting Incident: ${incident_number}
      <br>
      <br><br>
      All outstanding cases for submission:
      <br>
      ${html_table}`,
      "recipient": oic_email_list[i],
      "from": "donotreply@mail.postman.gov.sg",
      "reply_to": process.env.REPLY_TO_EMAIL
    }
    sendEmail(body)
  }
}

  module.exports={
    acknowledge
}
