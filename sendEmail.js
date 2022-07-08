const axios = require("axios");

async function sendEmail(body) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.POSTMAN_API_KEY}`,
  };

  try {
    return await axios.post(
      "https://api.postman.gov.sg/v1/transactional/email/send",
      body,
      { headers: headers }
    );
  } catch (error) {
    console.error(error);
  }
}

module.exports = {
  sendEmail,
};
