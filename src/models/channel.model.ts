import { Snowflake } from "discord.js";
import { Schema, model } from 'mongoose';

interface StoredChannel {
    id: Snowflake;
    name: String;
    server_id: Snowflake;
    intent: String;
}

const ChannelSchema = new Schema<StoredChannel>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    server_id: { type: String, required: true, ref: 'Server' },
    intent: {type: String, required: true}, 
});

const ChannelModel = model<StoredChannel>('Channel', ChannelSchema);

export default ChannelModel;