import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  mysqlAddr: process.env.MYSQL_ADDR!,
  mysqlDbName: process.env.MYSQL_DB_NAME!,
  mysqlUsername: process.env.MYSQL_USERNAME!,
  mysqlPasswd: process.env.MYSQL_PASSWD!,
  openaiOrgId: process.env.OPENAI_ORG_ID!,
  model3: 'gpt-3.5-turbo-0301',
  model4: 'gpt-4',
};
