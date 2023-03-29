import { Snowflake, Guild } from 'discord.js';
import { Schema, model } from 'mongoose';

export interface StoredServer {
    id: Snowflake;
    name: String;
}

const ServerSchema = new Schema<StoredServer>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true }
});

const ServerModel = model<StoredServer>('Server', ServerSchema);

export default ServerModel;