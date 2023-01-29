"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const token = process.env.BOT_TOKEN;
const bot = new telegraf_1.Telegraf(token);
const VIRGIN_ACTIVE_CLASS_QUERY_URL = 'https://hal.virginactive.com.sg/api/classes/bookableclassquery';
const SG_TIMEZONE = 'Asia/Singapore';
var LocationNames;
(function (LocationNames) {
    LocationNames["SRP"] = "Raffles Place";
    LocationNames["STP"] = "Tanjong Pagar";
    LocationNames["SHV"] = "Holland Village";
    LocationNames["SMO"] = "Marina One";
    LocationNames["SDG"] = "Duo Galleria";
    LocationNames["SPL"] = "Paya Lebar";
})(LocationNames || (LocationNames = {}));
const watchList = [];
const getUserList = (watchList, chatId) => {
    return (0, lodash_1.filter)(watchList, (watchedClass) => {
        return watchedClass.chatId === chatId;
    });
};
bot.start((ctx) => ctx.reply("Welcome to 'The Virgin Watchmen'"));
bot.command('watch', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    yield ctx.reply('Select a *Virgin Active SG* outlet.', {
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
}));
bot.command('list', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = ctx.message.chat.id;
    const userList = getUserList(watchList, chatId);
    if (userList.length > 0) {
        yield ctx.reply(`No. of Watched Classes: *${userList.length}*`, {
            parse_mode: 'Markdown',
        });
        const sendListOfClasses = () => __awaiter(void 0, void 0, void 0, function* () {
            userList.forEach((watchedClass) => __awaiter(void 0, void 0, void 0, function* () {
                const location = LocationNames[watchedClass.loc];
                yield ctx.reply(`Class: ${watchedClass.time} - ${watchedClass.name}${watchedClass.instructor && ` (${watchedClass.instructor})`}\nDate: ${watchedClass.date}\nLocation: ${location}\nSpaces Available: *${watchedClass.spaces}*`, {
                    parse_mode: 'Markdown',
                });
            }));
        });
        yield sendListOfClasses();
    }
    else {
        yield ctx.reply(`You're not watching any classes!`);
    }
}));
bot.command('spaces', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = ctx.message.chat.id;
    const userList = getUserList(watchList, chatId);
    if (userList.length > 0) {
        yield ctx.reply(`No. of Watched Classes: *${userList.length}*`, {
            parse_mode: 'Markdown',
        });
        const sessionWithSpaces = (0, lodash_1.filter)(userList, (watchedClass) => {
            return watchedClass.spaces > 0;
        });
        yield ctx.reply(`No. of Full Sessions: *${userList.length - sessionWithSpaces.length}*\nNo. of Sessions with Spaces: *${sessionWithSpaces.length}*`, {
            parse_mode: 'Markdown',
        });
        if (sessionWithSpaces.length > 0) {
            const sendListOfClasses = () => __awaiter(void 0, void 0, void 0, function* () {
                sessionWithSpaces.forEach((watchedClass) => __awaiter(void 0, void 0, void 0, function* () {
                    const location = LocationNames[watchedClass.loc];
                    yield ctx.reply(`Class: ${watchedClass.time} - ${watchedClass.name}${watchedClass.instructor && ` (${watchedClass.instructor})`}\nDate: ${watchedClass.date}\nLocation: ${location}\nSpaces Available: *${watchedClass.spaces}*`, {
                        parse_mode: 'Markdown',
                    });
                }));
            });
            yield sendListOfClasses();
        }
        else {
            yield ctx.reply(`Sorry! All sessions are *full* at the moment :(`, {
                parse_mode: 'Markdown',
            });
        }
    }
    else {
        yield ctx.reply(`You're not watching any classes!`);
    }
}));
bot.command('cancel', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = ctx.message.chat.id;
    const userList = getUserList(watchList, chatId);
    const watchedClassesResponse = userList.length > 0 &&
        userList.map((watchedClass) => ({
            text: `[${watchedClass.date.slice(5, 7)}/${watchedClass.date.slice(-2)}-${watchedClass.loc}] ${watchedClass.time} - ${watchedClass.name}${watchedClass.instructor && ` (${watchedClass.instructor})`}`,
            callback_data: JSON.stringify({
                t: 'c',
                cid: watchedClass.chatId,
                bid: watchedClass.bookingId,
            }),
        }));
    if (watchedClassesResponse) {
        yield ctx.reply(`Select a class to stop watching.`, {
            reply_markup: {
                inline_keyboard: (0, lodash_1.chunk)(watchedClassesResponse, 1),
            },
        });
    }
    else {
        yield ctx.reply(`You're not watching any classes!`);
    }
}));
bot.on('callback_query', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = ctx.callbackQuery.from.id;
    if (ctx.has((0, filters_1.callbackQuery)('data'))) {
        const data = JSON.parse(ctx.callbackQuery.data);
        // Respond to 'Location'
        if (data.t && data.t === 'l') {
            const date = new Date();
            const availableDates = (0, date_fns_1.eachDayOfInterval)({
                start: date,
                end: (0, date_fns_1.add)(date, { days: 8 }),
            });
            const dateOptions = availableDates.map((date) => ({
                text: (0, date_fns_tz_1.format)((0, date_fns_tz_1.utcToZonedTime)(date, SG_TIMEZONE), 'yyyy-MM-dd (EEE)', {
                    timeZone: SG_TIMEZONE,
                }),
                callback_data: JSON.stringify({
                    t: 'd',
                    d: (0, date_fns_tz_1.format)((0, date_fns_tz_1.utcToZonedTime)(date, SG_TIMEZONE), 'yyyy-MM-dd', {
                        timeZone: SG_TIMEZONE,
                    }),
                    l: data.l,
                }),
            }));
            yield ctx.answerCbQuery();
            const location = LocationNames[data.l];
            yield ctx.reply(`Select a date for *${location}*.`, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: (0, lodash_1.chunk)(dateOptions, 2),
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
                .then((response) => __awaiter(void 0, void 0, void 0, function* () {
                const responseData = yield response.json();
                const sessions = responseData &&
                    responseData.map((session) => ({
                        bookingId: session.BookingID,
                        time: session.TimeString,
                        name: session.ClassName,
                        instructor: session.Instructor,
                        spaces: session.SpacesRemaining,
                    }));
                if (sessions && sessions.length > 0) {
                    const sessionOptions = sessions.map((option) => ({
                        text: `${option.spaces} - ${option.time} - ${option.name}${option.instructor && ` (${option.instructor})`}`,
                        callback_data: JSON.stringify({
                            t: 's',
                            d: data.d.slice(5),
                            l: data.l,
                            i: option.bookingId,
                        }),
                    }));
                    yield ctx.answerCbQuery();
                    yield ctx.reply(`Select a session on *${data.d}*.`, {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: (0, lodash_1.chunk)(sessionOptions, 2),
                        },
                    });
                }
                else {
                    yield ctx.answerCbQuery();
                    yield ctx.reply('No sessions available.');
                }
            }))
                .catch(() => __awaiter(void 0, void 0, void 0, function* () {
                yield ctx.answerCbQuery();
                yield ctx.reply(`An error has occurred when getting info for:\n\n*${data.d}*.\n\nThere are either *no more classes* or classes have *yet to be released* for the day.`, {
                    parse_mode: 'Markdown',
                });
            }));
        }
        if (data.t && data.t === 's') {
            // TODO: Already watching
            const date = new Date();
            const zonedDate = (0, date_fns_tz_1.utcToZonedTime)(date, SG_TIMEZONE);
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
            fetchClasses.then((response) => __awaiter(void 0, void 0, void 0, function* () {
                const responseData = yield response.json();
                const watchedClass = (0, lodash_1.find)(responseData, (session) => {
                    return session.BookingID === data.i;
                });
                const result = watchedClass && {
                    name: watchedClass.ClassName,
                    time: watchedClass.TimeString,
                    spaces: watchedClass.SpacesRemaining,
                    instructor: watchedClass.Instructor,
                    booking_id: watchedClass.BookingID,
                };
                yield ctx.answerCbQuery();
                if (result) {
                    const location = LocationNames[data.l];
                    yield ctx.reply(`*Watching...*\n\nClass: ${result.time} - ${result.name}${result.instructor && ` (${result.instructor})`}\nDate: ${formattedDate}\nLocation: ${location}\nSpaces Available: *${result.spaces}*`, {
                        parse_mode: 'Markdown',
                    });
                    watchList.push(Object.assign(Object.assign({}, result), { chatId, date: formattedDate, loc: data.l, stale: false }));
                }
                else {
                    yield ctx.reply(`Class not found.`);
                }
            }));
        }
        if (data.t && data.t === 'c') {
            (0, lodash_1.remove)(watchList, (watchedClass) => {
                return (watchedClass.chatId === data.cid &&
                    watchedClass.bookingId === data.bid);
            });
            yield ctx.answerCbQuery();
            yield ctx.reply('Class has been unwatched.');
        }
    }
}));
bot.launch();
