import { Telegraf, Context } from 'telegraf';
import { Message } from 'typegram'
import { Database } from './database';
import { OpenAiApiWrapper } from './openai-api';
import * as TYPES from './types';
import { CreateChatCompletionResponse } from 'openai';

export class Commands {
  private bot: Telegraf<Context>;
  private db: Database;
  private openai: OpenAiApiWrapper;

  constructor(bot: Telegraf<Context>, db: Database, openai: OpenAiApiWrapper) {
    this.bot = bot;
    this.db = db;
    this.openai = openai;
    this.registerCommands();
  }

  private registerCommands(): void {
    this.bot.command('whoami', this.whoAmI.bind(this));
    this.bot.command('context', this.context.bind(this));
    this.bot.command('simple', this.simple.bind(this));
    this.bot.command('setassistant', this.setAssistant.bind(this));
    this.bot.command('resetassistant', this.resetAssistant.bind(this));
    this.bot.command('gpt3', this.setGptModel.bind(this, 'gpt-3.5-turbo-0301'));
    this.bot.command('gpt4', this.setGptModel.bind(this, 'gpt-4'));
    this.bot.on('text', this.handleText.bind(this));
  }

  private async whoAmI(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    const data = await this.db.getAllData(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    if (data.role === 1) {
      ctx.reply('You are Master ' + ctx.from.username + ', you can do everything!');
    } else {
      ctx.reply('You are noble ' + ctx.from.username + ', you can chat with me');
    }
    this.outputAssistantPersonality(ctx, data.personality);
    this.outputChatMode(ctx, data.mode);
    this.outputGptModel(ctx, data.gpt_model);
    await this.db.updateTimestamp(user);
  }

  private async context(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    const data = await this.db.getAllData(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    if (data.mode === 1) {
      ctx.reply('Already in context mode, starting new chat');
    }
    await this.db.setMode(user, 1);
    await this.db.createSession(user);
    const updated = await this.db.getAllData(user);
    this.outputChatMode(ctx, updated.mode);
    await this.db.updateTimestamp(user);
  }

  private async simple(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    const data = await this.db.getRole(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    await this.db.setMode(user, 0);
    const updated = await this.db.getAllData(user);
    this.outputChatMode(ctx, updated.mode);
    await this.db.updateTimestamp(user);
  }

  private async setAssistant(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    const data = await this.db.getRole(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    if (!ctx.message|| !(ctx.message as Message.TextMessage).text) return; // Add this check
    const assistant = (ctx.message as Message.TextMessage).text.substring(14);
    await this.db.setAssistant(user, assistant);
    const updated = await this.db.getAllData(user);
    this.outputAssistantPersonality(ctx, updated.personality);
    await this.db.updateTimestamp(user);
  }

  private async resetAssistant(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    const data = await this.db.getRole(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    await this.db.setAssistant(user, 'a friendly personal assistant');
    const updated = await this.db.getAllData(user);
    ctx.reply('Your assistant is: ' + updated.personality);
    await this.db.updateTimestamp(user);
  }

  private async setGptModel(ctx: Context, model: string): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    const data = await this.db.getRole(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    await this.db.setGptModel(user, model);
    const updated = await this.db.getAllData(user);
    ctx.reply('Your model is: ' + updated.gpt_model);
    await this.db.updateTimestamp(user);
  }

  private async handleText(ctx: Context): Promise<void> {
    if (!ctx.from || !ctx.from.username) return; // Add this check
    const user = ctx.from.username;
    let data = await this.db.getAllData(user);
    if (!data) {
      this.backOff(ctx);
      return;
    }
    const message = (ctx.message as Message.TextMessage).text;
    if (data.mode === 1) {
      if ((Date.now() - data.last_message) > 7200000) {
        await this.db.createSession(user);
        data = await this.db.getAllData(user);
        ctx.reply('Your context is too old (>2hrs), creating a new one');
      }
      await this.db.setContextMessage(user, false, message);
    }
    await this.db.updateTimestamp(user);

    let messages: TYPES.Message[];
    if (data.mode === 1) {
      messages = await this.db.getContextMessages(user);
    } else {
      messages = [
        { role: 'system', content: 'You are ' + data.personality },
        { role: 'user', content: message },
      ];
    }

    try {
      const response = await this.openai.createChatCompletion(data.gpt_model, messages, 0.8);
      const msg = (response as unknown as CreateChatCompletionResponse).choices[0]?.message?.content || '';
      if (data.mode === 1) {
        await this.db.setContextMessage(user, true, msg);
      }
      ctx.reply(msg);
    } catch (ex) {
      ctx.reply('Sorry, something went wrong. Please try again.');
    }
  }

  private backOff(ctx: Context): void {
    ctx.reply('Back off, I do not know you, ' + ctx.from?.username || '');
  }

  private outputChatMode(ctx: Context, mode: number): void {
    ctx.reply('Your chat mode is: ' + (mode === 1 ? 'context chat' : 'simple chat'));
  }

  private outputAssistantPersonality(ctx: Context, pers: string): void {
    ctx.reply('Your assistant is: ' + pers);
  }

  private outputGptModel(ctx: Context, mode: string): void {
    ctx.reply('Your GPT model is: ' + mode);
  }
}
