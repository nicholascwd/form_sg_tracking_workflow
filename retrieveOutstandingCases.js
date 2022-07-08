const AWS = require("aws-sdk");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
AWS.config.update({ region: "ap-southeast-1" });

const docClient = new AWS.DynamoDB.DocumentClient();
async function retrieveOutstandingCases(station) {
  const outstanding_incidents = await getIncidentsByStation(station);

  let table_data = [];
  const table_header = `
    <table style="border:1px solid #000;">
    <tr>
    <td>Incident No</td>
    <td>Callsign</td>
    <td>Prm Name</td>
    <td>Operator</td>
    <td>Status</td>
    <td>Acknowledge</td>
    </tr>`;

  table_data.push(table_header);
  for (i in outstanding_incidents) {
    table_data.push(`
        <tr>
            <td align=left ">${outstanding_incidents[i].incident_number}</td>
            <td align=left">${outstanding_incidents[i].callsign}</td>
            <td align=left">${outstanding_incidents[i].prm_name}</td>
            <td align=left">${outstanding_incidents[i].operator}</td>
            <td align=left">${outstanding_incidents[i].current_status}</td>
            <td align=left"><a href=${process.env.ACK_FORMSG_LINK}?${process.env.UNIQUE_ID_OIC_SUBMITTED}=${outstanding_incidents[i].submission_id}>Mark as Submitted</a></td>
        </tr>
        `);
  }
  const table_end = "</table>";
  table_data.push(table_end);
  const html_table = table_data.join("");
  return html_table;
}

async function getOicEmails(station) {
  const params = {
    ExpressionAttributeValues: {
      ":s": station,
    },
    KeyConditionExpression: "station = :s",
    TableName: "station-oic",
  };
  try {
    const results = await docClient.query(params).promise();
    return results.Items[0].oic_emails;
  } catch (err) {
    console.error(err);
  }
}

async function getIncidentsByStation(station) {
  const params = {
    FilterExpression: "station = :station",
    ExpressionAttributeValues: {
      ":station": station,
    },
    TableName: "form-notification",
  };

  try {
    const results = await docClient.scan(params).promise();
    return results.Items;
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  retrieveOutstandingCases,
  getOicEmails,
  getIncidentsByStation,
};
