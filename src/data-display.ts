import connectDB from "./utils/database-connect";
import MessageModel, { StoredMessage } from "./models/message.model";
import UserModel, { StoredUser } from "./models/user.model";

async function main(){
    let amogus_messages: Array<StoredMessage> = [];
    try {
        await connectDB();
        amogus_messages = await MessageModel.find({channel_id:'788415999023513600'}).sort({timestamp: 1});
    } catch (error) {
        console.log('Could not connect to the database.');
        console.log(error);
        return;
    }
    if (amogus_messages.length === 0) {
        console.log("There are no amogus messages saved in the database.");
        return;
    }
    
    let users_scores = new Map<string, number>();
    let previous_message = amogus_messages[0];
    let valid_streak_messages: Array<StoredMessage> = [];
    users_scores.set(previous_message.author_id, 1);

    //gets all valid amogus entries(must be one date between each(doesn't mean full day)).
    
    amogus_messages.forEach((message) => {
        let message_date = new Date(message.timestamp);
        let previous_message_date = new Date(previous_message.timestamp);

        if ( users_scores.has(message.author_id) 
        && isNextDayOrGreater(message_date, previous_message_date) ) {
            users_scores.set(message.author_id, users_scores.get(message.author_id) + 1);
            valid_streak_messages.push(message);

        } else if (isNextDayOrGreater(message_date, previous_message_date)) {
            users_scores.set(message.author_id, 1);
            valid_streak_messages.push(message);
        }

        previous_message = message;
    })

    users_scores.forEach(async (score, user_id)=>{
        let user: StoredUser = await UserModel.findOne({id:user_id});
        console.log(user.name+": "+score);
    })

    if (!valid_streak_messages[0]) {
        console.log('There are no valid streaks');
        return;
    }
    
    let user_streaks: Array<Array<[string ,Date]>> = [];
    previous_message = valid_streak_messages[0];
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
    
    let max: [number, number] = [0,0];
    for (let i = 0; i<user_streaks.length; i++) {
        if (user_streaks[i].length > max[1]){
            max[0] = i;
            max[1] = user_streaks[i].length;
        }
    }

    let longest_streak: StoredUser = await UserModel.findOne({id: user_streaks[max[0]][0][0]});
    console.log(longest_streak.name + ' longest streak of: '+ max[1] + 
    " from " + user_streaks[max[0]][0][1] + " to " + user_streaks[max[0]][max[1]-1][1]);
}

main();

function isNextDayOrGreater(date1: Date, date2: Date): boolean {
    if(date1.getFullYear()>date2.getFullYear()){
        return true;
    } else if (date1.getMonth() > date2.getMonth()) {
        return true;
    } else if (date1.getDate() > date2.getDate()) {
        return true;
    }
    return false;
}