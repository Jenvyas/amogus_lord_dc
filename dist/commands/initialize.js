"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('initialize')
        .setDescription('Initializes the amogus streak data.')
        .addChannelOption(option => option.setName('initialize_channel')
        .setDescription('channel to initialize the amogus data from')
        .addChannelTypes(discord_js_1.ChannelType.GuildText)
        .setRequired(true))
        .addStringOption(option => option.setName('starting_message_id')
        .setDescription('the message id from which to start looking at amogus data')
        .setRequired(true))
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const channel = interaction.options.getChannel('initialize_channel');
        let initial_message;
        try {
            initial_message = await channel.messages.fetch(interaction.options.getString('starting_message_id'));
        }
        catch (e) {
            interaction.editReply("could not get message");
            return;
        }
        let amogus_messages = [];
        let messages_response;
        do {
            messages_response = await channel.messages.fetch({
                limit: 100, after: initial_message.id
            });
            messages_response.forEach(message => {
                if (message.content.includes('ඞ'))
                    amogus_messages.push(message); // filters the message response for amogus messages
            });
            initial_message = messages_response.first(1).pop();
        } while (messages_response.size >= 100);
        let scores = new Map();
        amogus_messages.forEach(message => {
            if (scores.has(message.author)) {
                let score = scores.get(message.author);
                scores.set(message.author, score + 1);
            }
            else {
                scores.set(message.author, 1);
            }
        });
        let reply = "";
        scores.forEach((score, user) => reply += `${user.username}: ${score}\n`);
        interaction.editReply(reply);
    }
};
//# sourceMappingURL=initialize.js.map