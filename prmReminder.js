const AWS = require("aws-sdk");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { sendEmail } = require("./sendEmail");
dayjs.extend(customParseFormat);
AWS.config.update({ region: "ap-southeast-1" });

async function sendPrmReminder() {
  const docClient = new AWS.DynamoDB.DocumentClient();
  let cases_to_remind;

  const params = {
    FilterExpression: "current_status = :current_status",
    ExpressionAttributeValues: {
      ":current_status": "pending",
    },
    TableName: "form-notification",
  };

  try {
    const results = await docClient.scan(params).promise();
    cases_to_remind = results.Items;
  } catch (err) {
    console.error(err);
  }

  const emailRes = await Promise.allSettled(
    cases_to_remind.map((i) => {
      const body_prm_reminder_email = {
        subject: `Reminder to submit Heartsave Incident ${i.station} ${i.incident_number} by PRM ${i.prm_name}`,
        body: `<p>Dear PRM,</p>
            Gentle reminder to submit the Heartsave. If you have submitted this case already, kindly update the status via the instructions below. Thank you.
            <br><br>
            Incident Number: ${i.incident_number} <br>
            PRM Name: ${i.prm_name} <br>
            Callsign: ${i.callsign} <br>
            Operator: ${i.operator}
            <br><br>
            Once you have submitted the files to station computer Sharepoint, please come back to this email and click the link below to update the status. The OIC will be updated via email once you have done so.
            <br><br>
            <a href=${process.env.PRM_SUB_FORMSG_LINK}?${process.env.UNIQUE_ID_PRM_SUBMITTED}=${i.submission_id}>Mark as submitted to station computer Sharepoint</a>
            <br><br>
            --- Heartsave Tracking System`,
        recipient: i.prm_email,
        from: process.env.SENDER_FROM_EMAIL,
        reply_to: process.env.REPLY_TO_EMAIL,
      };
      return sendEmail(body_prm_reminder_email);
    })
  );
  console.log(emailRes);
}

module.exports = {
  sendPrmReminder,
};
