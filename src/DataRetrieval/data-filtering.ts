import MessageModel, { StoredMessage } from "../models/message.model.js";
import UserModel, { StoredUser } from "../models/user.model.js";
import ChannelModel, { StoredChannel } from "../models/channel.model.js";
import { isNextDayOrGreater } from "../utils/streak_check.js";

export async function getStreakChannel(server_id: string): Promise<StoredChannel> {
    return await ChannelModel.findOne({server_id, intent: 'streak'});
}

/**
 * Filters and returns all the valid streak messages from a specifiec discord channel in the
 * database
 * @param channel_id The id of the discord channel from which to get the messages
 * @returns A chronologically sorted array of valid streak messages.
 */
export async function getValidStreakMessages(channel_id: string): Promise<StoredMessage[]>{
    let amogus_messages: StoredMessage[] = [];

    amogus_messages = await MessageModel.find({channel_id}).sort({timestamp: 1});
    
    if (amogus_messages.length === 0) {
        throw({
            error_code: 1,
            error_message: "There are no amogus messages saved in the database."
        });
    }
    
    let users_scores = new Map<string, number>();
    let previous_message = amogus_messages[0];
    let valid_streak_messages: StoredMessage[] = [];
    users_scores.set(previous_message.author_id, 1);

    //gets all valid amogus entries(must be one date between each(doesn't mean full day)).
    
    amogus_messages.forEach((message) => {
        let message_date = new Date(message.timestamp);
        let previous_message_date = new Date(previous_message.timestamp);

        if ( users_scores.has(message.author_id) 
        && isNextDayOrGreater(message_date, previous_message_date) ) {
            valid_streak_messages.push(message);
        } else if (isNextDayOrGreater(message_date, previous_message_date)) {
            valid_streak_messages.push(message);
        }

        previous_message = message;
    })

    return valid_streak_messages;
}

/**
 * Gets all uninterrupted user streaks, the message had to have been sent on the next day and
 * no other messages must have been sent before it by other users on that day.
 * @param valid_streak_messages A chronologically sorted array of all valid streak messages
 * @returns a two-dimenstional array, 2nd dimenstion being a single full uninterrupted streak 
 * from one user, contains a tuple made up of a userId and the Date of the message
 */
export function getUserStreaks(valid_streak_messages: StoredMessage[]): [string ,Date][][] {
    let user_streaks: Array< Array<[string ,Date]> > = [];
    let previous_message = valid_streak_messages[0];
    user_streaks.push([[previous_message.author_id, new Date(previous_message.timestamp)]]);

    valid_streak_messages.forEach(message => {
        let previous_message_tomorrow = new Date(previous_message.timestamp);
        previous_message_tomorrow.setDate(previous_message_tomorrow.getDate()+1);

        let message_date = new Date(message.timestamp);

        if (message_date.getDate() === previous_message_tomorrow.getDate()
        && user_streaks[user_streaks.length-1][0][0] === message.author_id) {
            user_streaks[user_streaks.length-1].push([message.author_id, message_date]);
        } else {
            user_streaks.push([[message.author_id, message_date]]);
        }

        previous_message = message;
    });

    return user_streaks; 
}

/**
 * Gets info about multiple users from database and returns a map with the user info.
 * @param user_ids an array of userIds
 * @returns A map with a UserId key corresponding to the UserInfo as stored in db
 */
export async function getMapOfUserInfo(user_ids: string[]): Promise<Map<string, StoredUser>>{
    let users = new Map<string, StoredUser>();
    
    for (const id of user_ids) {
        let user: StoredUser = await UserModel.findOne({id});
        users.set(id,user);
    }

    return users;
}

/**
 * 
 * @param messages array of valid streak messages to count
 * @returns a map of userId -> valid message count
 */
export function getMapOfUserValidMessageCount(messages: StoredMessage[]) {
    let user_scores = new Map<string, number>();
    messages.forEach(message => {
        if (user_scores.has(message.author_id)) {
            user_scores.set(message.author_id, user_scores.get(message.author_id)+1);
        } else {
            user_scores.set(message.author_id, 1);
        }
    })
    return user_scores;
}

