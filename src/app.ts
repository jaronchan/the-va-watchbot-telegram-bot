import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';
import { eachDayOfInterval, add } from 'date-fns';
import { format, utcToZonedTime } from 'date-fns-tz';

const token = process.env.BOT_TOKEN as string;

const bot: Telegraf<Context<Update>> = new Telegraf(token);

const VIRGIN_ACTIVE_CLASS_QUERY_URL =
  'https://hal.virginactive.com.sg/api/classes/bookableclassquery';

const SG_TIMEZONE = 'Asia/Singapore';

const locationNames = {
  SRP: 'Raffles Place',
  STP: 'Tanjong Pagar',
  SHV: 'Holland Village',
  SMO: 'Marina One',
  SDG: 'Duo Galleria',
  SPL: 'Paya Lebar',
};

const errorToDisplay = (error) => {
  if (error.response) {
    return `VA Server Responded with ${error.response.status}`;
  } else if (error.request) {
    return `No response received from VA.`;
  } else {
    return `Error: ${error.message}`;
  }
};

let watchLists = [];

bot.start((ctx) => ctx.reply("Welcome to 'The Virgin Watchmen'"));

bot.command('watch', async (ctx) => {
  await ctx.reply('Select a *Virgin Active SG* outlet.', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Raffles Place',
            callback_data: JSON.stringify({
              t: 'l',
              l: 'SRP',
            }),
          },
          {
            text: 'Tanjong Pagar',
            callback_data: JSON.stringify({
              t: 'l',
              l: 'STP',
            }),
          },
        ],
        [
          {
            text: 'Holland Village',
            callback_data: JSON.stringify({
              t: 'l',
              l: 'SHV',
            }),
          },
          {
            text: 'Marina One',
            callback_data: JSON.stringify({
              t: 'l',
              l: 'SMO',
            }),
          },
        ],
        [
          {
            text: 'Duo Galleria',
            callback_data: JSON.stringify({
              t: 'l',
              l: 'SDG',
            }),
          },
          {
            text: 'Paya Lebar',
            callback_data: JSON.stringify({
              t: 'l',
              l: 'SPL',
            }),
          },
        ],
      ],
    },
  });
});
