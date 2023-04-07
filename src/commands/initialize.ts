import { ChannelType, SlashCommandBuilder, TextChannel, 
    User, Message, Collection, ChatInputCommandInteraction } from 'discord.js';
import mongoose from 'mongoose';
import ChannelModel from '../models/channel.model.js';
import MessageModel from '../models/message.model.js';
import ServerModel from '../models/server.model.js';
import UserModel from '../models/user.model.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('initialize')
        .setDescription('Initializes the amogus streak data.')
        .addChannelOption(option =>
            option.setName('initialize_channel')
                .setDescription('channel to initialize the amogus data from')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('starting_message_id')
                .setDescription('the message id from which to start looking at amogus data')
                .setRequired(false))
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
            try {
                await db_server.save();
            } catch (error) {
                //servers are stored uniquely in the db, this is so the channel can still be saved.
                if (!(error.code === 11000)) {
                    interaction.editReply('There was a database problem when trying to store server data.');
                    return;
                }
            }

            const db_channel = new ChannelModel({
                id: channel.id,
                name: channel.name,
                server_id: interaction.guildId,
                intent: 'streak', 
            });
            await db_channel.save();
        } catch (error) {
            if (!(error.code === 11000)) {
                interaction.editReply('There was a database problem when trying to store server data.');
                return;
            }
        }

        if(!(interaction.options.getString('starting_message_id'))) {
            interaction.editReply(`Channel has been initialized.'}`);
            return;
        }

        let initial_message: Message;
        try {
            initial_message = await channel.messages.fetch(interaction.options.getString('starting_message_id'));
        } catch (e) {
            interaction.editReply("Could not find message.");
            return;
        }

        let amogus_messages: Array<Message> = [];
        let duplicate_messages = false;
        try {
            amogus_messages = await getAmogusMessages(channel, initial_message);
            let users: Set<string>= new Set<string>();

            for (const message of amogus_messages) {
                if ((!users.has(message.author.id))) {
                    users.add(message.author.id);

                    const db_user = new UserModel({
                        id:message.author.id,
                        name:message.author.username,
                        profile_picture_url:message.author.avatarURL() || message.author.defaultAvatarURL,
                    })
                    try {
                        await db_user.save();
                    } catch(error){
                        if (error.code === 11000) {
                            // this error code means that there already exists an entry for this userID
                            // in the database, which is fine and doesn't cause any issues.
                        } else {
                            interaction.editReply('There was a problem while saving users to database.');
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
                });
                try {
                    await db_message.save();
                } catch (error) {
                    if (error instanceof mongoose.Error.ValidationError) {
                        interaction.editReply("Failed to validate message(s)");
                        console.log(error);
                        return;
                    } else if (error.code === 11000) {
                        duplicate_messages = true;
                    } else {
                        interaction.editReply("There was a problem saving the messages to the database.");
                        return;
                    }
                }
                
            }
        } catch (error) {
                interaction.editReply("There was a problem retrieving the messages.");
                console.log(error);
                return;
        }
        
        interaction.editReply(`Channel has been initialized. ${duplicate_messages && 'One or more messages have already been initialized before.'}`);
    }
};

async function getAmogusMessages(channel: TextChannel, initial_message: Message): Promise<Array<Message>> {
    let amogus_messages: Array<Message> = [];
    let messages_response: Collection<string, Message>;
    do {
        messages_response = await channel.messages.fetch({
            limit: 100, after: initial_message.id
        });

        messages_response.forEach(message => {
            if (message.content.includes('ඞ'))
                amogus_messages.push(message); // filters the message response for amogus messages
        });

        initial_message = messages_response.first(1).pop();
    } while (messages_response.size >= 1)
    return amogus_messages;
}
