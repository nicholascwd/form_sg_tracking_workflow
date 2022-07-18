const AWS = require("aws-sdk");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const { retrieveOutstandingCases } = require("./retrieveOutstandingCases");
const { sendEmail } = require("./sendEmail");
dayjs.extend(customParseFormat);
AWS.config.update({ region: "ap-southeast-1" });

async function getStationData() {
  const docClient = new AWS.DynamoDB.DocumentClient();

  const params = {
    TableName: "station-oic",
  };

  try {
    const results = await docClient.scan(params).promise();
    stations = results.Items;
    return stations;
  } catch (err) {
    console.error(err);
  }
}

async function sendOicDigest() {
  const stationData = await getStationData();
  for (i in stationData) {
    const station = stationData[i].station;
    const oic_email_list = stationData[i].oic_emails
      .split(";")
      .map((x) => x.trim());

    const html_table = await retrieveOutstandingCases(station);
    const emailRes = await Promise.allSettled(
      oic_email_list.map((i) => {
        const body_oic_email = {
          subject: `Heartsave Daily OIC Digest for ${station}`,
          body: `<p>Dear OICs,</p>
      Here is the daily digest for ${station} for outstanding Heartsaves.
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
  sendOicDigest,
};
