const { Telegraf } = require('telegraf');
const { Configuration, OpenAIApi } = require("openai");
const sqlite3 = require('sqlite3').verbose();

const token = process.env.TELEGRAM_BOT_TOKEN;
const openaiApiKey = process.env.OPENAI_API_KEY;

const bot = new Telegraf(token);

const configuration = new Configuration({
  apiKey: openaiApiKey,
  organization: "org-wWtJw41woUKH94AF2qdGu1qs"
});
const openai = new OpenAIApi(configuration);

let db = new sqlite3.Database('./db/data.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  else {
    console.log('Connected to the database.');
  }
});

bot.context.db = {
  getRole: (username) => {
    return new Promise((resolve) => {
      db.get(`select role from users where username = ?`, username, (err, data) => {
        console.log(data);
        console.log(username);
        resolve(data);
      });
    });
  },
  getAllData: (username) => {
    return new Promise((resolve) => {
      db.get(`select role, personality from users u inner join assistant_personality a where u.id = a.userId and u.username = ?`, username, (err, data) => {
        console.log(data);
        console.log(username);
        resolve(data);
      });
    });
  },
  setAssistant: (username, assistant) => {
    return new Promise((resolve) => {
      db.run(`update assistant_personality set personality = ? where userId = (select id from users where username = ?)`, [assistant, username], (err, data) => {
        if (err) {
          console.error(err.message);
        }
        resolve();
      });
    });
  },
}

bot.command('whoami', async (ctx) => {
  const user = ctx.from.username;
  const data = await ctx.db.getAllData(user);
  if (!data) {
    ctx.reply('Back off, I do not know you, '+ctx.from.username);
    return;
  }
  if (data.role === 1) {
    ctx.reply('You are Master '+ctx.from.username+', you can do everything!');
  }
  else {
    ctx.reply('You are noble '+ctx.from.username+', you can chat with me');
  }

  ctx.reply('Your assistant is: '+data.personality);
});

bot.command('setassistant', async (ctx) => {
  const user = ctx.from.username;
  const data = await ctx.db.getRole(user);
  if (!data) {
    ctx.reply('Back off, I do not know you, '+ctx.from.username);
    return;
  }
  const assistant = ctx.message.text.substring(14);
  console.log(assistant);
  await ctx.db.setAssistant(user, assistant);
  const updated = await ctx.db.getAllData(user);
  ctx.reply('Your assistant is: '+updated.personality);
});

bot.command('resetassistant', async (ctx) => {
  const user = ctx.from.username;
  const data = await ctx.db.getRole(user);
  if (!data) {
    ctx.reply('Back off, I do not know you, '+ctx.from.username);
    return;
  }
  await ctx.db.setAssistant(user, 'a friendly personal assistant');
  const updated = await ctx.db.getAllData(user);
  ctx.reply('Your assistant is: '+updated.personality);
});


bot.on('text', async (ctx) => {
  // Get the text message from the context object
  const user = ctx.from.username;
  const data = await ctx.db.getAllData(user);
  if (!data) {
    ctx.reply('Back off, I do not know you, '+ctx.from.username);
    return;
  }
  const message = ctx.message.text;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-0301',
      messages: [
        {"role": "system", "content": 'You are '+data.personality},
        {"role": "user", "content": message},
      ],
      temperature: 0.8,
    });

    // Send the response back to the user
    ctx.reply(response.data.choices[0].message.content);
  }
  catch (ex) {
    ctx.reply('Sorry, shit happens, please try again');
  }
});

// Start the bot
bot.launch()