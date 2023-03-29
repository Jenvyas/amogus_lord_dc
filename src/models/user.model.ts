import { Snowflake } from 'discord.js';
import { Schema, model } from 'mongoose';

export interface StoredUser {
    id: Snowflake;
    name: String;
    profile_picture_url: String;
}

const UserSchema = new Schema<StoredUser>({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true},
    profile_picture_url: { type: String, required: true },
});

const UserModel = model<StoredUser>('User', UserSchema);

export default UserModel;