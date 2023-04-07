import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { AttachmentBuilder, Client, Collection, Events, GatewayIntentBits, Message, Webhook } from 'discord.js';
import connectDB from './DataRetrieval/database-connect.js';
import ChannelModel, { StoredChannel } from './models/channel.model.js';
import WebhookModel, { StoredWebhook } from './models/webhook.model.js';
import { isNextDayOrGreater } from './utils/streak_check.js';
import MessageModel from './models/message.model.js';
import { create_message_leaderboard } from './DataVisualization/streak-charts.js';
import { getMapOfUserInfo } from './DataRetrieval/data-filtering.js';
import EventEmitter from 'node:events';

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

for(const file of command_files){
	const file_path = path.join(commands_path, file);
	const command  = require(file_path);
	
	if('data' in command && 'execute' in command) {
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

	const channel = await ChannelModel.findOne({id: message.channelId, intent: 'streak'});

	if(!channel) {
		return;
	}
	
	const db_message = new MessageModel({
		id: message.id,
		author_id: message.author.id,
		channel_id: message.channelId,
		timestamp: message.createdTimestamp,
		content: message.content,
	})

	await db_message.save();

	const previous_valid_message = await MessageModel.findOne({id: channel.last_valid_message_id});

	if (!previous_valid_message) {
		return;
	}

	if (!(isNextDayOrGreater(new Date(message.createdTimestamp), new Date(previous_valid_message.timestamp)))) {
		return;
	}

	await ChannelModel.updateOne({ id: channel.id }, {last_valid_message_id: message.id});

	const webhooks = await WebhookModel.find({server_id: message.guildId});

	if(!webhooks.length) {
		return;
	}

	webhooks.forEach(async stored_webhook => {
		const webhook = await client.fetchWebhook(stored_webhook.id, stored_webhook.token);
		update_leaderboard(webhook, stored_webhook.leaderboard_id, channel.leaderboard, message);
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
			{content: 'There was an error while executing this command',
			ephemeral: true}
		);
	}
});

client.login(token);

async function update_leaderboard(webhook: Webhook, leaderboard_id: string, user_scores: Map<string, number>, message: Message) {

	if (user_scores.has(message.author.id)) {
		user_scores.set(message.author.id, user_scores.get(message.author.id)+1);
	} else {
		user_scores.set(message.author.id, 1);
	}

	user_scores = new Map([...user_scores.entries()].sort((a, b) => b[1] - a[1]));

	await ChannelModel.updateOne({ id: message.channelId }, { leaderboard: user_scores });
	
	let user_id_to_user = await getMapOfUserInfo([...user_scores.keys()]);

	let leaderboard_canvas = await create_message_leaderboard(user_scores, user_id_to_user);
	
	const out = fs.createWriteStream('./images/' + message.channelId + '/leaderboard.png');

	const image_event = new EventEmitter();

	out.on('open', () => {
		const stream = leaderboard_canvas.createPNGStream();
		stream.on('data', chunk => { out.write(chunk); });
		stream.on('end', () => { image_event.emit('ready'); });
	});

	const thumbnail_file = new AttachmentBuilder('./images/amogus_thumbnail.jpg');

	const leaderboard_embed = {
		color: 0xB4E599,
		title: 'Leaderboard',
		description: 'Leaderboard of amoguses sent in amogus uwu',
		thumbnail: {
			url: 'attachment://amogus_thumbnail.jpg',
		},
		fields: [...user_scores.entries()].map((entry, index) => {
			return {
				name: user_id_to_user.get(entry[0]).name.concat(index === 0 ? ' :crown:' : ''),
				value: `${entry[1]}`,
				inline: index !== 0,
			}
		}),
		image: {
			url: 'attachment://leaderboard.png',
		},
		timestamp: new Date().toISOString(),
		footer: {
			text: 'This is still in development :(',
			icon_url: 'attachment://amogus_thumbnail.jpg',
		},
	};

	image_event.on('ready', async () => {
		const leaderboard_file = new AttachmentBuilder('./images/' + message.channelId + '/leaderboard.png');
		webhook.editMessage(leaderboard_id,{ embeds: [leaderboard_embed], files: [thumbnail_file, leaderboard_file] });
	});
} 