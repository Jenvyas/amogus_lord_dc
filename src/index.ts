import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder, Client, Collection, Events, GatewayIntentBits, Message, Webhook } from 'discord.js';
import connectDB from './DataRetrieval/database-connect.js';
import ChannelModel, { StoredChannel } from './models/channel.model.js';
import WebhookModel, { StoredWebhook } from './models/webhook.model.js';
import { isNextDayOrGreater } from './utils/streak_check.js';
import MessageModel from './models/message.model.js';
import { create_leaderboard_embed, update_stored_leaderboard } from './Leaderboard/leaderboard.js';
import { getMapOfUserInfo } from './DataRetrieval/data-filtering.js';
import EventEmitter from 'node:events';
import UserModel from './models/user.model.js';

dotenv.config();
const token = process.env.TOKEN;

connectDB().catch((e) => {
	console.log(`Could not connect to MongoDB: ${e}`);
});

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	]
});

client.commands = new Collection();

const commands_path = path.join(__dirname, 'commands');
const command_files = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

for (const file of command_files) {
	const file_path = path.join(commands_path, file);
	const command = require(file_path);

	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${file_path} is missing a required "data" 
		or "execute" property.`);
	}
}

client.on('messageCreate', async message => {
	if (!message.content.includes('ඞ')) {
		return;
	}

	const channel = await ChannelModel.findOne({ id: message.channelId, intent: 'streak' });

	if (!channel) {
		return;
	}

	const user = await UserModel.findOne({id: message.author.id});

	if (!user) {
		const db_user = new UserModel({
			id:message.author.id,
			name:message.author.username,
			profile_picture_url:message.author.avatarURL() || message.author.defaultAvatarURL,
		});
		try {
			await db_user.save();
		} catch(error){
			if (error.code === 11000) {
				// this error code means that there already exists an entry for this userID
				// in the database, which is fine and doesn't cause any issues.
			} else {
				console.log(error);
				console.log(db_user);
				return;
			}
		}
	}

	const db_message = new MessageModel({
		id: message.id,
		author_id: message.author.id,
		channel_id: message.channelId,
		timestamp: message.createdTimestamp,
		content: message.content,
	})

	await db_message.save();

	const previous_valid_message = await MessageModel.findOne({ id: channel.last_valid_message_id });

	if (!previous_valid_message) {
		return;
	}

	if (!(isNextDayOrGreater(new Date(message.createdTimestamp), new Date(previous_valid_message.timestamp)))) {
		return;
	}

	await ChannelModel.updateOne({ id: channel.id }, { last_valid_message_id: message.id });

	const webhooks = await WebhookModel.find({ server_id: message.guildId });

	if (!webhooks.length) {
		return;
	}

	let user_scores = channel.leaderboard;

	user_scores = await update_stored_leaderboard(user_scores, message);

	const user_id_to_user = await getMapOfUserInfo([...user_scores.keys()]);
	const leaderboard_embed = await create_leaderboard_embed(user_scores, user_id_to_user, message.channelId);

	webhooks.forEach(async stored_webhook => {
		const webhook = await client.fetchWebhook(stored_webhook.id, stored_webhook.token);
		webhook.editMessage(stored_webhook.leaderboard_id,{ embeds: [leaderboard_embed.embed_object], files: [leaderboard_embed.thumbnail_file, leaderboard_embed.leaderboard_chart] });
	});
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply(
			{
				content: 'There was an error while executing this command',
				ephemeral: true
			}
		);
	}
});

client.login(token);