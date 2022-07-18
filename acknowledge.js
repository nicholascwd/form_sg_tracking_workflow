const AWS = require("aws-sdk");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const {
  retrieveOutstandingCases,
  getOicEmails,
} = require("./retrieveOutstandingCases");
const { sendEmail } = require("./sendEmail");
dayjs.extend(customParseFormat);

AWS.config.update({ region: "ap-southeast-1" });

async function acknowledge(responses, mode) {
  const response = responses.responses;
  const submission_id = response.find((x) => x.question == "Unique ID").answer;
  let station;
  let incident_number;
  let prm_email;

  const docClient = new AWS.DynamoDB.DocumentClient();
  const paramsQuery = {
    ExpressionAttributeValues: {
      ":s": submission_id,
    },
    KeyConditionExpression: "submission_id = :s",
    TableName: "form-notification",
  };

  try {
    const results = await docClient.query(paramsQuery).promise();
    station = results.Items[0].station;
    incident_number = results.Items[0].incident_number;
    prm_email = results.Items[0].prm_email;
  } catch (err) {
    console.error(err);
  }

  if (mode == "oic") {
    const paramsDelete = {
      TableName: "form-notification",
      Key: {
        submission_id: submission_id,
      },
    };
    try {
      await docClient.delete(paramsDelete).promise();
    } catch (err) {
      console.error(err);
    }
    const prmEmailBodyOicSubmitted = {
      subject: `Heartsave submission ${incident_number} has been submitted by your OIC`,
      body: `<p>Dear PRM,</p>
    <br>
    Your OIC has submitted ${incident_number} to HQ auditors.
    <br>Thank you.
    <br><br>
    --- Heartsave Tracking System`,
      recipient: prm_email,
      from: process.env.SENDER_FROM_EMAIL,
      reply_to: process.env.REPLY_TO_EMAIL,
    };
    await sendEmail(prmEmailBodyOicSubmitted);
  } else if (mode == "prm") {
    const params_update_status = {
      TableName: "form-notification",
      Key: {
        submission_id: submission_id,
      },
      UpdateExpression: `set current_status = :status_of_submission`,
      ExpressionAttributeValues: {
        ":status_of_submission": "On Stn Computer",
      },
    };

    try {
      await docClient.update(params_update_status).promise();
    } catch (err) {
      console.error(err);
    }
    const prmEmailBody = {
      subject: `Status of Heartsave submission ${incident_number} updated`,
      body: `<p>Dear PRM,</p>
    <br>
    Thank you for submitting ${incident_number} to the station computer.
    <br>The status of incident: ${incident_number} is currently "On Station Computer" and OIC has been informed.
    <br><br>
    --- Heartsave Tracking System`,
      recipient: prm_email,
      from: process.env.SENDER_FROM_EMAIL,
      reply_to: process.env.REPLY_TO_EMAIL,
    };
    await sendEmail(prmEmailBody);
  }

  if (process.env.FEATURE_FLAG_DIGESTMODE != "digest") {
    const oic_emails = await getOicEmails(station);
    const oic_email_list = oic_emails.split(";");
    const html_table = await retrieveOutstandingCases(station);

    const emailRes = await Promise.allSettled(
      oic_email_list.map((i) => {
        const body_oic_email = {
          subject: `Status of Heartsave submission ${incident_number} updated`,
          body: `<p>Dear OICs,</p>
      <br>
      Status updated: ${mode} has submitted Incident: ${incident_number}
      <br>
      <br><br>
      All outstanding cases for submission:
      <br>
      ${html_table}
      <br>
      --- Heartsave Tracking System`,
          recipient: i,
          from: process.env.SENDER_FROM_EMAIL,
          reply_to: process.env.REPLY_TO_EMAIL,
        };
        return sendEmail(body_oic_email);
      })
    );

    console.log(emailRes);
  }
}

module.exports = {
  acknowledge,
};
