import { Snowflake } from 'discord.js';
import { Schema, model } from 'mongoose';

export interface StoredWebhook {
    id: Snowflake;
    token: Snowflake;
    server_id: Snowflake;
    leaderboard_id: Snowflake;
}

const WebhookSchema = new Schema<StoredWebhook>({
    id: { type: String, required: true, unique: true },
    token: { type: String, required: true},
    server_id: { type: String, required: true },
    leaderboard_id: { type: String, required: true }
});

const WebhookModel = model<StoredWebhook>('Webhook', WebhookSchema);

export default WebhookModel;