import {
  filter as _filter,
  chunk as _chunk,
  find as _find,
  remove as _remove,
} from 'lodash';
import { Context, Telegraf } from 'telegraf';
import { callbackQuery } from 'telegraf/filters';

import { Update } from 'typegram';
import { eachDayOfInterval, add } from 'date-fns';
import { format, utcToZonedTime } from 'date-fns-tz';

const token = process.env.BOT_TOKEN as string;

const bot: Telegraf<Context<Update>> = new Telegraf(token);

const VIRGIN_ACTIVE_CLASS_QUERY_URL =
  'https://hal.virginactive.com.sg/api/classes/bookableclassquery';

const SG_TIMEZONE = 'Asia/Singapore';

enum LocationNames {
  SRP = 'Raffles Place',
  STP = 'Tanjong Pagar',
  SHV = 'Holland Village',
  SMO = 'Marina One',
  SDG = 'Duo Galleria',
  SPL = 'Paya Lebar',
}

// const errorToDisplay = (error) => {
//   if (error.response) {
//     return `VA Server Responded with ${error.response.status}`;
//   } else if (error.request) {
//     return `No response received from VA.`;
//   } else {
//     return `Error: ${error.message}`;
//   }
// };

type AvailableClass = {
  bookingId: number;
  time: string;
  name: string;
  instructor: string;
  spaces: number;
};

interface WatchedClass extends AvailableClass {
  chatId: number;
  date: string;
  loc: string;
  stale: boolean;
}

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
        const location =
          LocationNames[watchedClass.loc as keyof typeof LocationNames];
        await ctx.reply(
          `Class: ${watchedClass.time} - ${watchedClass.name}${
            watchedClass.instructor && ` (${watchedClass.instructor})`
          }\nDate: ${
            watchedClass.date
          }\nLocation: ${location}\nSpaces Available: *${watchedClass.spaces}*`,
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
          const location =
            LocationNames[watchedClass.loc as keyof typeof LocationNames];
          await ctx.reply(
            `Class: ${watchedClass.time} - ${watchedClass.name}${
              watchedClass.instructor && ` (${watchedClass.instructor})`
            }\nDate: ${
              watchedClass.date
            }\nLocation: ${location}\nSpaces Available: *${
              watchedClass.spaces
            }*`,
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

bot.on('callback_query', async (ctx) => {
  const chatId = ctx.callbackQuery.from.id;
  if (ctx.has(callbackQuery('data'))) {
    const data = JSON.parse(ctx.callbackQuery.data);

    // Respond to 'Location'
    if (data.t && data.t === 'l') {
      const date = new Date();
      const availableDates = eachDayOfInterval({
        start: date,
        end: add(date, { days: 8 }),
      });

      const dateOptions = availableDates.map((date) => ({
        text: format(utcToZonedTime(date, SG_TIMEZONE), 'yyyy-MM-dd (EEE)', {
          timeZone: SG_TIMEZONE,
        }),
        callback_data: JSON.stringify({
          t: 'd',
          d: format(utcToZonedTime(date, SG_TIMEZONE), 'yyyy-MM-dd', {
            timeZone: SG_TIMEZONE,
          }),
          l: data.l,
        }),
      }));

      await ctx.answerCbQuery();

      const location = LocationNames[data.l as keyof typeof LocationNames];
      await ctx.reply(`Select a date for *${location}*.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: _chunk(dateOptions, 2),
        },
      });
    }

    if (data.t && data.t === 'd') {
      const options = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({
          Category: 0,
          AMPM: 'ALL',
          ISODate: data.d,
          SiteID: data.l,
        }),
      };

      const fetchClasses = fetch(VIRGIN_ACTIVE_CLASS_QUERY_URL, options);
      fetchClasses
        .then(async (response) => {
          const responseData = await response.json();
          const sessions =
            responseData &&
            responseData.map(
              (session: any): AvailableClass => ({
                bookingId: session.BookingID,
                time: session.TimeString,
                name: session.ClassName,
                instructor: session.Instructor,
                spaces: session.SpacesRemaining,
              })
            );
          if (sessions && sessions.length > 0) {
            const sessionOptions = sessions.map((option: AvailableClass) => ({
              text: `${option.spaces} - ${option.time} - ${option.name}${
                option.instructor && ` (${option.instructor})`
              }`,
              callback_data: JSON.stringify({
                t: 's',
                d: data.d.slice(5),
                l: data.l,
                i: option.bookingId,
              }),
            }));
            await ctx.answerCbQuery();
            await ctx.reply(`Select a session on *${data.d}*.`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: _chunk(sessionOptions, 2),
              },
            });
          } else {
            await ctx.answerCbQuery();
            await ctx.reply('No sessions available.');
          }
        })
        .catch(async () => {
          await ctx.answerCbQuery();
          await ctx.reply(
            `An error has occurred when getting info for:\n\n*${data.d}*.\n\nThere are either *no more classes* or classes have *yet to be released* for the day.`,
            {
              parse_mode: 'Markdown',
            }
          );
        });
    }

    if (data.t && data.t === 's') {
      // TODO: Already watching

      const date = new Date();
      const zonedDate = utcToZonedTime(date, SG_TIMEZONE);
      const formattedDate = `${zonedDate.getFullYear().toString()}-${data.d}`;

      const options = {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({
          Category: 0,
          AMPM: 'ALL',
          ISODate: formattedDate,
          SiteID: data.l,
        }),
      };

      const fetchClasses = fetch(VIRGIN_ACTIVE_CLASS_QUERY_URL, options);

      fetchClasses.then(async (response) => {
        const responseData = await response.json();
        const watchedClass = _find(responseData, (session: any) => {
          return session.BookingID === data.i;
        });

        const result: AvailableClass = watchedClass && {
          name: watchedClass.ClassName,
          time: watchedClass.TimeString,
          spaces: watchedClass.SpacesRemaining,
          instructor: watchedClass.Instructor,
          booking_id: watchedClass.BookingID,
        };

        await ctx.answerCbQuery();

        if (result) {
          const location = LocationNames[data.l as keyof typeof LocationNames];
          await ctx.reply(
            `*Watching...*\n\nClass: ${result.time} - ${result.name}${
              result.instructor && ` (${result.instructor})`
            }\nDate: ${formattedDate}\nLocation: ${location}\nSpaces Available: *${
              result.spaces
            }*`,
            {
              parse_mode: 'Markdown',
            }
          );
          watchList.push({
            ...result,
            chatId,
            date: formattedDate,
            loc: data.l,
            stale: false,
          });
        } else {
          await ctx.reply(`Class not found.`);
        }
      });
    }
    if (data.t && data.t === 'c') {
      _remove(watchList, (watchedClass) => {
        return (
          watchedClass.chatId === data.cid &&
          watchedClass.bookingId === data.bid
        );
      });

      await ctx.answerCbQuery();
      await ctx.reply('Class has been unwatched.');
    }
  }
});

bot.launch();
