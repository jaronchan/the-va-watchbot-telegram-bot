import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';

const token = process.env.BOT_TOKEN as string;

const bot: Telegraf<Context<Update>> = new Telegraf(token);
