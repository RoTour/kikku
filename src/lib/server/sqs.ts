import { env } from "$env/dynamic/private";
import { SQSClient } from "@aws-sdk/client-sqs";

const region = env.AWS_REGION || "eu-west-3";

export const sqsClient = new SQSClient({
  region,
  credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
  }
});
