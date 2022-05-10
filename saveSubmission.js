const AWS = require('aws-sdk'); 
const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { retrieveOutstandingCases } = require('./retrieveOutstandingCases');
const { sendEmail } = require('./sendEmail');
dayjs.extend(customParseFormat)
AWS.config.update({region: 'ap-southeast-1'});


async function saveSubmission(header, responses) {
  const submission_id = header.submissionId
  const response = responses.responses
    
  const docClient = new AWS.DynamoDB.DocumentClient();

  const inc_date = dayjs(response.find(x=>x._id=='6271f6868545190012e6cd83').answer, "DD MMM YYYY").format('YYYYMMDD')
  const inc_date_readble = dayjs(response.find(x=>x._id=='6271f6868545190012e6cd83').answer, "DD MMM YYYY").format('DD/MM/YYYY')
  const oic = response.find(x=>x.question=='OIC').answer
  const prm_name = response.find(x=>x._id=='6271f6778545190012e6cd78').answer
  const incident_number = `${inc_date}/${response.find(x=>x._id=='6271f6918545190012e6cd8e').answer}`
  const callsign = response.find(x=>x.question=='Callsign').answer
  const seperator = response.find(x=>x.question=='OIC').answer.indexOf(';')
  const station = oic.substring(0, seperator)
  const oic_emails = oic.substring(seperator+1)
  const operator = response.find(x=>x.question=='Operator').answer

  const params_form_data = {
    TableName: 'form-notification',
    Item: {
      'submission_id': submission_id,
      'prm_name': prm_name,
      'incident_number': incident_number,
      'incident_date': inc_date_readble,
      'callsign': callsign,
      'operator': operator,
      'station': station
    }
  };

  try {
    await docClient.put(params_form_data).promise();
  } catch (err) {
    console.error(err)
  }
  

  const params_station_oic = {
    TableName: 'station-oic',
    Item: {
      'station': station,
      'oic_emails': oic_emails
    }
  };

  try {
    await docClient.put(params_station_oic).promise();
  } catch (err) {
    console.error(err)
  }

  const oic_email_list = oic_emails.split(';')
  const html_table = await retrieveOutstandingCases(station)

  for (i in oic_email_list){
    const body = {
      "subject": `New Heartsave Submission ${incident_number} by ${prm_name}`,
      "body": `<p>Dear OICs,</p>
      Kindly assist with the submission of the new incident:
      <br><br>
      Incident Number: ${incident_number} <br>
      PRM Name: ${prm_name} <br>
      Callsign: ${callsign} <br>
       Operator: ${operator}
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
  };
  
  module.exports={
    saveSubmission
}
