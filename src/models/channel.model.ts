import { Snowflake } from "discord.js";
import { Schema, model } from 'mongoose';

export interface StoredChannel {
    id: Snowflake;
    name: String;
    server_id: Snowflake;
    intent: String;
    last_valid_message_id: Snowflake;
    leaderboard: Map<string, number>;
    max_streak: [Snowflake, Number];
    current_streak: [Snowflake, Number];
}

const ChannelSchema = new Schema<StoredChannel>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    server_id: { type: String, required: true, ref: 'Server' },
    intent: {type: String, required: true},
    last_valid_message_id: {type: String, required: false, default: null},
    leaderboard: {type: Map, required: false, default: null},
    max_streak: {type: [String, Number], required: false, default: null},
    current_streak: {type: [String, Number], required: false, default: null}
});

const ChannelModel = model<StoredChannel>('Channel', ChannelSchema);

export default ChannelModel;