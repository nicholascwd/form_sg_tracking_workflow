# Submission tracking workflow

> Allows for tracking of case submissions by various stakeholders. Accessible on GSIB and Internet

## Basic
- Input of incidents and acknowledgement's via FormSG
- Email notifications and tracking to Internet & WOG emails via Postman for higher deliverability
- Data persists on DynamoDB till no longer required for tracking purposes

## Architecture & Deployment
- Currently deployed via `sls deploy`
- `sls` handles CloudFormation, API Gateway, Lamda etc.

## Environment Variable
To be documented...
