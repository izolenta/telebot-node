import { OpenAiApiWrapper } from './openai-api';
import { Telegraf, Context } from 'telegraf';
import { Database } from './database';
import { Commands } from './commands';
import { config } from './config';

require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN ?? '';

const bot = new Telegraf<Context>(token);
const openai = new OpenAiApiWrapper();
const db = new Database(
  {
    host: config.mysqlAddr,
    user: config.mysqlUsername,
    password: config.mysqlPasswd,
    database: config.mysqlDbName,
  }
);
const commands = new Commands(bot, db, openai);

bot.context.db = db;
bot.context.openai = openai;

bot.command('whoami', (ctx) => commands.whoAmI(ctx));
bot.command('context', (ctx) => commands.context(ctx));
bot.command('simple', (ctx) => commands.simple(ctx));
bot.command('setassistant', (ctx) => commands.setAssistant(ctx));
bot.command('resetassistant', (ctx) => commands.resetAssistant(ctx));
bot.command('gpt3', (ctx) => commands.setGptModel(ctx, 'gpt-3.5-turbo-0301'));
bot.command('gpt4', (ctx) => commands.setGptModel(ctx, 'gpt-4'));

bot.on('text', (ctx) => commands.handleText(ctx));

(async () => {
  await db.connect();
  bot.launch();
  console.log('Bot is running...');
})();
