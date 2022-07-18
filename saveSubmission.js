const AWS = require("aws-sdk");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { retrieveOutstandingCases } = require("./retrieveOutstandingCases");
const { sendEmail } = require("./sendEmail");
dayjs.extend(customParseFormat);
AWS.config.update({ region: "ap-southeast-1" });

async function saveSubmission(header, responses) {
  const submission_id = header.submissionId;
  const response = responses.responses;
  const docClient = new AWS.DynamoDB.DocumentClient();

  const inc_date = dayjs(
    response.find((x) => x.question == "Incident Number Date").answer,
    "DD MMM YYYY"
  ).format("YYYYMMDD");
  const inc_date_readble = dayjs(
    response.find((x) => x.question == "Incident Number Date").answer,
    "DD MMM YYYY"
  ).format("DD/MM/YYYY");
  const oic = response.find((x) => x.question == "OIC").answer;
  const prm_name = response.find((x) => x.question == "PRM Name").answer;
  const prm_email = response.find((x) => x.question == "PRM Email").answer;
  const incident_number = `${inc_date}/${
    response.find((x) => x.question == "Incident Number").answer
  }`;
  const callsign = response.find((x) => x.question == "Callsign").answer;
  const seperator = response
    .find((x) => x.question == "OIC")
    .answer.indexOf(";");
  const station = oic.substring(0, seperator);
  const oic_emails = oic.substring(seperator + 1);
  const operator = response.find((x) => x.question == "Operator").answer;

  const params_form_data = {
    TableName: "form-notification",
    Item: {
      submission_id: submission_id,
      prm_name: prm_name,
      prm_email: prm_email,
      incident_number: incident_number,
      incident_date: inc_date_readble,
      callsign: callsign,
      operator: operator,
      station: station,
      current_status: "pending",
    },
  };

  try {
    await docClient.put(params_form_data).promise();
  } catch (err) {
    console.error(err);
  }

  const params_station_oic = {
    TableName: "station-oic",
    Item: {
      station: station,
      oic_emails: oic_emails,
    },
  };

  try {
    await docClient.put(params_station_oic).promise();
  } catch (err) {
    console.error(err);
  }

  if (process.env.FEATURE_FLAG_DIGESTMODE != "digest") {
    const oic_email_list = oic_emails.split(";").map((x) => x.trim());
    const html_table = await retrieveOutstandingCases(station);

    const emailRes = await Promise.allSettled(
      oic_email_list.map((i) => {
        const body_oic_email = {
          subject: `New Heartsave Incident ${station} ${incident_number} by PRM ${prm_name}`,
          body: `<p>Dear OICs,</p>
      New Heartsave incident:
      <br><br>
      Incident Number: ${incident_number} <br>
      PRM Name: ${prm_name} <br>
      Callsign: ${callsign} <br>
      Operator: ${operator}
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
  const body_prm_email = {
    subject: `New Heartsave Incident ${station} ${incident_number} by PRM ${prm_name}`,
    body: `<p>Dear PRM,</p>
    New Heartsave incident has been created and OIC has been notified:
    <br><br>
    Incident Number: ${incident_number} <br>
    PRM Name: ${prm_name} <br>
    Callsign: ${callsign} <br>
    Operator: ${operator}
    <br><br>
    Once you have submitted the files to station computer Sharepoint, please come back to this email and click the link below to update the status. The OIC will be updated via email once you have done so.
    <br><br>
    <a href=${process.env.PRM_SUB_FORMSG_LINK}?${process.env.UNIQUE_ID_PRM_SUBMITTED}=${submission_id}>Mark as submitted to station computer Sharepoint</a>
    <br><br>
    --- Heartsave Tracking System`,
    recipient: prm_email,
    from: process.env.SENDER_FROM_EMAIL,
    reply_to: process.env.REPLY_TO_EMAIL,
  };
  await sendEmail(body_prm_email);
}

module.exports = {
  saveSubmission,
};
