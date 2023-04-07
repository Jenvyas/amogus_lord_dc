import { SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import { getMapOfUserInfo, getMapOfUserValidMessageCount, getStreakChannel, getValidStreakMessages } from '../DataRetrieval/data-filtering.js';
import { create_message_leaderboard } from '../DataVisualization/streak-charts.js';
import { EventEmitter } from 'events';
import WebhookModel from '../models/webhook.model.js';
import ChannelModel from '../models/channel.model.js';

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

        let leaderboard_canvas = await create_message_leaderboard(user_scores, user_id_to_user);

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

        const out = fs.createWriteStream('./images/' + streak_channel.id + '/leaderboard.png');

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
            const leaderboard_file = new AttachmentBuilder('./images/' + streak_channel.id + '/leaderboard.png');
            const message = await webhook.send({ embeds: [leaderboard_embed], files: [thumbnail_file, leaderboard_file] });
            await interaction.editReply('Done!');
            await interaction.deleteReply();

            let webhook_db = new WebhookModel({
                id: webhook.id,
                token: webhook.token,
                server_id: interaction.guildId,
                leaderboard_id: message.id,
            });

            webhook_db.save();
        });
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
