import { ChannelType, SlashCommandBuilder, TextChannel, 
    User, Message, Collection, ChatInputCommandInteraction } from 'discord.js';
import mongoose from 'mongoose';
import ChannelModel from '../models/channel.model';
import MessageModel from '../models/message.model';
import ServerModel from '../models/server.model';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('initialize')
        .setDescription('Initializes the amogus streak data.')
        .addChannelOption(option =>
            option.setName('initialize_channel')
                .setDescription('channel to initialize the amogus data from')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option=>
            option.setName('starting_message_id')
                .setDescription('the message id from which to start looking at amogus data')
                .setRequired(true))
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('initialize_channel') as TextChannel;
        if(!channel.isTextBased()){
            interaction.editReply('Specified channel is not text based.');
            return;
        }
        
        try {
            const db_server = new ServerModel({
                id: interaction.guildId,
                name: interaction.guild.name,
            })
            await db_server.save();
        } catch (error) {
            if (!(error.code === 11000)) {
                interaction.editReply('There was a problem with the database when trying to store server data.');
                return;
            }
        }

        try {
            const db_channel = new ChannelModel({
                id: channel.id,
                name: channel.name,
                server_id: interaction.guildId,
                intent: 'streak', 
            });
            await db_channel.save();
        } catch (error) {
            if (!(error.code === 11000)) {
                interaction.editReply('There was a problem with the database when trying to store channel data.');
                return;
            }
        }

        let initial_message: Message;
        try {
            initial_message = await channel.messages.fetch(interaction.options.getString('starting_message_id'));
        } catch (e) {
            interaction.editReply("Could not find message.");
            return;
        }

        let amogus_messages: Array<Message> = [];
        try {
            amogus_messages = await getAmogusMessages(channel, initial_message);
            for (const message of amogus_messages) {
                const db_message = new MessageModel({
                    id: message.id,
                    author_id: message.author.id,
                    channel_id: message.channelId,
                    timestamp: message.createdTimestamp,
                    content: message.content,
                });
                await db_message.save();
            }
        } catch (error) {
            if (error instanceof mongoose.Error.ValidationError) {
                interaction.editReply("Failed to validate message(s)");
                console.log(error);
            } else if (error.code === 11000) {
                interaction.editReply("Part of or all of the messages have already been initialized.");
            } else {
                interaction.editReply("There was a problem retrieving the messages.");
            }
            return;
        }
        
        /* was used for generating player scores
        let scores = new Map<User, number>();
        
        amogus_messages.forEach(message=>{
            if (scores.has(message.author)) {
                let score = scores.get(message.author);
                scores.set(message.author, score + 1);
            } else {
                scores.set(message.author, 1);
            }
        });
        
        let reply = "";
        scores.forEach((score, user)=>reply+=`${user.username}: ${score}\n`);
        */
        interaction.editReply("Channel has been initialized");
    }
};

async function getAmogusMessages(channel: TextChannel, initial_message: Message): Promise<Array<Message>>{
    let amogus_messages: Array<Message> = [];
        let messages_response: Collection<string,Message>;
        do {
            messages_response= await channel.messages.fetch({
                limit: 100, after: initial_message.id});

            messages_response.forEach(message=>{
                if (message.content.includes('ඞ'))
                    amogus_messages.push(message); // filters the message response for amogus messages
            });

            initial_message = messages_response.first(1).pop();
        } while(messages_response.size>=100)
    return amogus_messages;
}



