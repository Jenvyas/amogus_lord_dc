import { Snowflake, Message } from 'discord.js';
import { Schema, model } from 'mongoose';

interface StoredMessage {
    id: Snowflake;
    author_id: Snowflake;
    channel_id: Snowflake;
    timestamp: number;
    content: String;
}

const MessageSchema = new Schema<StoredMessage>({
    id: { type: String, required: true, unique: true },
    author_id: { type: String, required: true, ref: 'User' },
    channel_id: { type: String, required: true , ref: 'Channel'},
    timestamp: { type: Number, required: true },
    content: { type: String, required: true },
});

const MessageModel = model<StoredMessage>('Message', MessageSchema);

export default MessageModel;