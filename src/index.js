const { Telegraf } = require('telegraf');
const { Configuration, OpenAIApi } = require("openai");
const mysql = require('mysql2/promise');
require('dotenv').config()

const token = process.env.TELEGRAM_BOT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;
const mysqlAddr = process.env.MYSQL_ADDR;
const mysqlDbName = process.env.MYSQL_DB_NAME;
const mysqlUsername = process.env.MYSQL_USERNAME;
const mysqlPasswd = process.env.MYSQL_PASSWD;
const orgId = process.env.OPENAI_ORG_ID;

const model3 = 'gpt-3.5-turbo-0301';
const model4 = 'gpt-4';

const bot = new Telegraf(token);

bot.use(async (ctx, next) => {
  const user = ctx.from.username;
  let data = await ctx.db.getAllData(user);
  if (!data) {
    backOff(ctx);
    return;
  }
  await next();
})


const configuration = new Configuration({
  apiKey: openaiApiKey,
  organization: orgId
});
const openai = new OpenAIApi(configuration);

let con;

const updateTimestamp = async (username)  => {
  await con.query(`update states set last_message = ? where user_id = (select id from users where username = ?)`, [new Date(), username]);
}

const outputChatMode = (ctx, mode) => {
  ctx.reply('Your chat mode is: '+(mode === 1? 'context chat' : 'simple chat'));
}

const outputAssistantPersonality = (ctx, pers) => {
  ctx.reply('Your assistant is: '+pers);
}

const outputGptModel = (ctx, mode) => {
  ctx.reply('Your GPT model is: '+mode);
}

const backOff = (ctx) => {
  ctx.reply('Back off, I do not know you, '+ctx.from.username);
}

bot.context.db = {
  getRole: async (username) => {
    let data = await con.query(`select role from users where username = ?`, username);
    console.log(data[0][0]);
    return data[0][0];
  },
  getAllData: async (username) => {
    let data = await con.query(`select role, personality, mode, last_message, gpt_model from users u inner join states s where u.id = s.user_id and u.username = ?`, username);
    console.log(data[0][0]);
    return data[0][0];
  },
  setAssistant: async (username, assistant) => {
    await con.query(`update states set personality = ? where user_id = (select id from users where username = ?)`, [assistant, username]);
  },
  setMode: async (username, mode) => {
    await con.query(`update states set mode = ? where user_id = (select id from users where username = ?)`, [mode, username]);
  },
  setGptModel: async (username, model) => {
    await con.query(`update states set gpt_model = ? where user_id = (select id from users where username = ?)`, [model, username]);
  },
  createSession: async (username) => {
    await con.query(`update states set session_id = ((select maxval FROM (SELECT MAX(session_id) AS maxval FROM states) AS sub_selected_value) + 1) where user_id = (select id from users where username = ?)`, [username]);
    await con.query(`delete from sessions where session_id < ((select maxval FROM (SELECT MAX(session_id) AS maxval FROM states) AS sub_selected_value) + 1) and user_id = (select id from users where username = ?)`, [username]);
  },
  setContextMessage: async (username, isIncoming, text) => {
    let data = await con.query(`select session_id, user_id from states where user_id = (select id from users where username = ?)`, username);
    console.log('session id: '+data[0][0].session_id);
    console.log('user id: '+data[0][0].user_id);
    await con.query(`insert into sessions (session_id, user_id, message, incoming, timestamp) values (?, ?, ?, ?, ?)`, [data[0][0].session_id, data[0][0].user_id, text, isIncoming, new Date()]);
  },
  getContextMessages: async (username) => {
    const messages = [];
    let wrapper = await con.query(`select personality, session_id from users u inner join states s where u.id = s.user_id and u.username = ?`, username);
    messages.push({"role": "system", "content": 'You are '+wrapper[0][0].personality})

    let msgs = await con.query(`select message, incoming from sessions where session_id = ? order by timestamp`, wrapper[0][0].session_id);
    for (let next of msgs[0]) {
      if (next.incoming === 0) {
        messages.push({'role': 'user', 'content': next.message});
      }
      else {
        messages.push({'role': 'assistant', 'content': next.message});
      }
    }
    console.log(messages);
    return messages;
  },
}

async function updateModel(ctx, model) {
  const user = ctx.from.username;
  await ctx.db.setGptModel(user, model);
  const updated = await ctx.db.getAllData(user);
  ctx.reply('Your model is: '+updated.gpt_model);
  await updateTimestamp(user);
}
bot.command('whoami', async (ctx) => {
  const user = ctx.from.username;
  const data = await ctx.db.getAllData(user);
  if (data.role === 1) {
    ctx.reply('You are Master '+ctx.from.username+', you can do everything!');
  }
  else {
    ctx.reply('You are noble '+ctx.from.username+', you can chat with me');
  }
  outputAssistantPersonality(ctx, data.personality);
  outputChatMode(ctx, data.mode);
  outputGptModel(ctx, data.gpt_model);
  await updateTimestamp(user);
});

bot.command('context', async (ctx) => {
  const user = ctx.from.username;
  const data = await ctx.db.getAllData(user);
  if (data.mode === 1) {
    ctx.reply('Already in context mode, starting new chat');
  }
  await ctx.db.setMode(user, 1);
  await ctx.db.createSession(user);
  const updated = await ctx.db.getAllData(user);
  outputChatMode(ctx, updated.mode)
  await updateTimestamp(user);
});

bot.command('simple', async (ctx) => {
  const user = ctx.from.username;
  await ctx.db.setMode(user, 0);
  const updated = await ctx.db.getAllData(user);
  outputChatMode(ctx, updated.mode)
  await updateTimestamp(user);
});


bot.command('setassistant', async (ctx) => {
  const user = ctx.from.username;
  const assistant = ctx.message.text.substring(14);
  console.log(assistant);
  await ctx.db.setAssistant(user, assistant);
  const updated = await ctx.db.getAllData(user);
  outputAssistantPersonality(ctx, updated.personality);
  await updateTimestamp(user);
});

bot.command('resetassistant', async (ctx) => {
  const user = ctx.from.username;
  await ctx.db.setAssistant(user, 'a friendly personal assistant');
  const updated = await ctx.db.getAllData(user);
  ctx.reply('Your assistant is: '+updated.personality);
  await updateTimestamp(user);
});

bot.command('gpt3', async (ctx) => {
  await updateModel(ctx, model3);
});

bot.command('gpt4', async (ctx) => {
  await updateModel(ctx, model4);
});
bot.on('text', async (ctx) => {
  // Get the text message from the context object
  const user = ctx.from.username;
  let data = await ctx.db.getAllData(user);
  const message = ctx.message.text;
  if (data.mode === 1) {
    if ((Date.now() - data.last_message) > 7200000) {
      await ctx.db.createSession(user);
      data = await ctx.db.getAllData(user);
      ctx.reply('Your context is too old (>2hrs), creating a new one');
    }
    await ctx.db.setContextMessage(user, false, message);
  }
  await updateTimestamp(user);

  let messages;
  if (data.mode === 1) {
    messages = await ctx.db.getContextMessages(user);
  }
  else {
    messages = [
      {"role": "system", "content": 'You are '+data.personality},
      {"role": "user", "content": message},
    ];
  }


  try {
    const response = await openai.createChatCompletion({
      model: data.gpt_model,
      messages: messages,
      temperature: 0.8,
    });

    // Send the response back to the user
    const msg = response.data.choices[0].message.content;
    if (data.mode === 1) {
      await ctx.db.setContextMessage(user, true, msg);
    }
    ctx.reply(msg);
  }
  catch (ex) {
    ctx.reply('Sorry, shit happens, please try again');
  }
});

const main = async () => {
  con = mysql.createPool({
    host: mysqlAddr,
    user: mysqlUsername,
    database: mysqlDbName,
    password: mysqlPasswd,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0
  });
  // con = await mysql.createConnection({
  //   host: mysqlAddr,
  //   user: mysqlUsername,
  //   password: mysqlPasswd,
  //   database: mysqlDbName
  // });
// Start the bot
  bot.launch();
}

main();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
