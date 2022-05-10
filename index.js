const serverless = require('serverless-http');
const express = require('express');
const { saveSubmission } = require('./saveSubmission');
const { acknowledge } = require('./acknowledge');
const app = express()
 

app.get('/test', function (req, res) {
  console.log(process.env.TEST)
  res.sendStatus(200)
  })

// Instantiating formsg-sdk without parameters default to using the package's
// production public signing key.
const formsg = require('@opengovsg/formsg-sdk')({
    mode: process.env.FORM_SG_MODE,
  })
 
// This is where your domain is hosted, and should match
// the URI supplied to FormSG in the form dashboard
const POST_URI = process.env.SUBMISSION_FORM_URI
const POST_URI_ACK = process.env.ACK_FORM_URI

// Your form's secret key downloaded from FormSG upon form creation
// const formSecretKey = process.env.FORM_SECRET_KEY
const formSecretKey = process.env.FORM_SECRET_KEY
const formSecretKeyAck = process.env.FORM_SECRET_KEY_ACK
// Set to true if you need to download and decrypt attachments from submissions
const HAS_ATTACHMENTS = false

app.post(
  '/submissions',
  // Endpoint authentication by verifying signatures
  function (req, res, next) {
    console.log(req)
    try {
      formsg.webhooks.authenticate(req.get('X-FormSG-Signature'), POST_URI)
      // Continue processing the POST body
      return next()
    } catch (e) {
      console.log(POST_URI)
        console.log("Unauthorized returned")
      return res.status(401).send({ message: 'Unauthorized' })
    }
  },
  // Parse JSON from raw request body
  express.json(),
  // Decrypt the submission
  async function (req, res, next) {
    // If `verifiedContent` is provided in `req.body.data`, the return object
    // will include a verified key.
    const submission = HAS_ATTACHMENTS
      ? await formsg.crypto.decryptWithAttachments(formSecretKey, req.body.data)
      : formsg.crypto.decrypt(formSecretKey, req.body.data)

    // If the decryption failed, submission will be `null`.
    if (submission) {
      // Continue processing the submission
      saveSubmission(req.body.data, submission)
      res.sendStatus(200)
    } else {
      // Could not decrypt the submission
      console.log("Could not decrypt")
      res.sendStatus(200)
    }
  }
)

app.post(
  '/ack',
  // Endpoint authentication by verifying signatures
  function (req, res, next) {
    console.log(req)
    try {
      formsg.webhooks.authenticate(req.get('X-FormSG-Signature'), POST_URI_ACK)
      // Continue processing the POST body
      return next()
    } catch (e) {
        console.log("Unauthorized returned")
      return res.status(401).send({ message: 'Unauthorized' })
    }
  },
  // Parse JSON from raw request body
  express.json(),
  // Decrypt the submission
  async function (req, res, next) {
    // If `verifiedContent` is provided in `req.body.data`, the return object
    // will include a verified key.
    const submission = HAS_ATTACHMENTS
      ? await formsg.crypto.decryptWithAttachments(formSecretKeyAck, req.body.data)
      : formsg.crypto.decrypt(formSecretKeyAck, req.body.data)

    // If the decryption failed, submission will be `null`.
    if (submission) {
      // Continue processing the submission
      acknowledge(submission)
      res.sendStatus(200)
    } else {
      // Could not decrypt the submission
      console.log("Could not decrypt")
    //   console.log(submission)
      res.sendStatus(200)
    }
  }
)
module.exports.handler = serverless(app);
