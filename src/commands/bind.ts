import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import { getMapOfUserInfo, getMapOfUserValidMessageCount, getStreakChannel, getValidStreakMessages } from '../DataRetrieval/data-filtering.js';
import { create_leaderboard_chart, create_leaderboard_embed } from '../Leaderboard/leaderboard.js';
import { EventEmitter } from 'events';
import WebhookModel from '../models/webhook.model.js';
import ChannelModel from '../models/channel.model.js';
import { channel } from 'diagnostics_channel';

interface field {
    name: string,
    value: string,
    inline: boolean,
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Binds the amogus statistics to the channel where command was executed.'),
    async execute(interaction: ChatInputCommandInteraction) {
        interaction.deferReply();

        if (interaction.channel.isThread()) {
            interaction.reply("Can not bind to a thread!");
            return;
        }

        let webhook = await interaction.channel.createWebhook({
            name: 'AmogusHook'
        });

        let streak_channel = await getStreakChannel(interaction.guildId);

        let valid_messages = await getValidStreakMessages(streak_channel.id);
        
        await ChannelModel.updateOne({ id: streak_channel.id }, { last_valid_message_id: valid_messages[valid_messages.length - 1].id });

        let user_scores = getMapOfUserValidMessageCount(valid_messages);
        user_scores = new Map([...user_scores.entries()].sort((a, b) => b[1] - a[1]));

        await ChannelModel.updateOne({ id: streak_channel.id }, { leaderboard: user_scores });

        let user_id_to_user = await getMapOfUserInfo([...user_scores.keys()]);

        try {
            fs.mkdirSync('./images');
        } catch (error) {
            if (error.code !== 'EEXIST') {
                console.log(error);
                return;
            }
        }

        try {
            fs.mkdirSync('./images/' + streak_channel.id);
        } catch (error) {
            if (error.code !== 'EEXIST')
                return;
        }

        const leaderboard_embed = await create_leaderboard_embed(user_scores, user_id_to_user, streak_channel.id);

        const message = await webhook.send({ embeds: [leaderboard_embed.embed_object], files: [leaderboard_embed.thumbnail_file, leaderboard_embed.leaderboard_chart] });
        await interaction.editReply('Done!');
        await interaction.deleteReply();

        let webhook_db = new WebhookModel({
            id: webhook.id,
            token: webhook.token,
            server_id: interaction.guildId,
            leaderboard_id: message.id,
        });

        webhook_db.save();
    }
};

function two_inline_columns(fields: field[]): field[] {
    let counter = 0;
    for (let i = 0; i < fields.length; i++) {
        counter++;
        if (counter === 2){
            fields.splice(i, 0, {
                name: '\u200b',
                value: '\u200b',
                inline: false,
            });
            i++;
            counter = 0;
        }
    }
    return fields;
}
