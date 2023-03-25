import * as dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import connectDB from './database';

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