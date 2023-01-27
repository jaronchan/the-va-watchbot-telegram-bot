import { filter as _filter, chunk as _chunk } from 'lodash';
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

type WatchedClass = {
  chatId: number;
  bookingId: number;
  time: string;
  name: string;
  instructor: string;
  date: string;
  loc: string;
  spaces: number;
};

type WatchList = Array<WatchedClass>;

const watchList: WatchList = [];
const getUserList = (watchList: WatchList, chatId: number) => {
  return _filter(watchList, (watchedClass) => {
    return watchedClass.chatId === chatId;
  });
};

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

bot.command('list', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const userList = getUserList(watchList, chatId);

  if (userList.length > 0) {
    await ctx.reply(`No. of Watched Classes: *${userList.length}*`, {
      parse_mode: 'Markdown',
    });

    const sendListOfClasses = async () => {
      userList.forEach(async (watchedClass) => {
        await ctx.reply(
          `Class: ${watchedClass.time} - ${watchedClass.name}${
            watchedClass.instructor && ` (${watchedClass.instructor})`
          }\nDate: ${watchedClass.date}\nLocation: ${
            locationNames[watchedClass.loc]
          }\nSpaces Available: *${watchedClass.spaces}*`,
          {
            parse_mode: 'Markdown',
          }
        );
      });
    };

    await sendListOfClasses();
  } else {
    await ctx.reply(`You're not watching any classes!`);
  }
});

bot.command('spaces', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const userList = getUserList(watchList, chatId);

  if (userList.length > 0) {
    await ctx.reply(`No. of Watched Classes: *${userList.length}*`, {
      parse_mode: 'Markdown',
    });

    const sessionWithSpaces = _filter(userList, (watchedClass) => {
      return watchedClass.spaces > 0;
    });

    await ctx.reply(
      `No. of Full Sessions: *${
        userList.length - sessionWithSpaces.length
      }*\nNo. of Sessions with Spaces: *${sessionWithSpaces.length}*`,
      {
        parse_mode: 'Markdown',
      }
    );

    if (sessionWithSpaces.length > 0) {
      const sendListOfClasses = async () => {
        sessionWithSpaces.forEach(async (watchedClass) => {
          await ctx.reply(
            `Class: ${watchedClass.time} - ${watchedClass.name}${
              watchedClass.instructor && ` (${watchedClass.instructor})`
            }\nDate: ${watchedClass.date}\nLocation: ${
              locationNames[watchedClass.loc]
            }\nSpaces Available: *${watchedClass.spaces}*`,
            {
              parse_mode: 'Markdown',
            }
          );
        });
      };
      await sendListOfClasses();
    } else {
      await ctx.reply(`Sorry! All sessions are *full* at the moment :(`, {
        parse_mode: 'Markdown',
      });
    }
  } else {
    await ctx.reply(`You're not watching any classes!`);
  }
});

bot.command('cancel', async (ctx) => {
  const chatId = ctx.message.chat.id;
  const userList = getUserList(watchList, chatId);

  const watchedClassesResponse =
    userList.length > 0 &&
    userList.map((watchedClass) => ({
      text: `[${watchedClass.date.slice(5, 7)}/${watchedClass.date.slice(-2)}-${
        watchedClass.loc
      }] ${watchedClass.time} - ${watchedClass.name}${
        watchedClass.instructor && ` (${watchedClass.instructor})`
      }`,
      callback_data: JSON.stringify({
        t: 'c',
        cid: watchedClass.chatId,
        bid: watchedClass.bookingId,
      }),
    }));

  if (watchedClassesResponse) {
    await ctx.reply(`Select a class to stop watching.`, {
      reply_markup: {
        inline_keyboard: _chunk(watchedClassesResponse, 1),
      },
    });
  } else {
    await ctx.reply(`You're not watching any classes!`);
  }
});
