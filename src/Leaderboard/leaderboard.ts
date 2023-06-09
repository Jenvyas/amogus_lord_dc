import { StoredUser } from '../models/user.model.js';
import { createCanvas, Canvas } from 'canvas';
import { AttachmentBuilder, Embed, Message, Snowflake, Webhook } from 'discord.js';
import fs from 'fs';
import ChannelModel, { StoredChannel } from '../models/channel.model.js';
import { StoredMessage } from '../models/message.model.js';
import { isNextDay } from '../utils/streak_check.js';

export interface LeaderboardEmbed {
    embed_object: any,
    thumbnail_file: AttachmentBuilder,
    leaderboard_chart: AttachmentBuilder,
}

export interface StreakEmbed {
    embed_object: any,
}

export interface Streaks {
    max_streak: [string, number | Number],
    current_streak: [string, number | Number],
}

export async function create_leaderboard_chart(user_message_count: Map<string, number>, user_id_to_user: Map<string, StoredUser>): Promise<Canvas> {
    const { Chart, Colors } = await require('chart.js/auto');
    const ChartDataLabels = await require('chartjs-plugin-datalabels');

    Chart.register(Colors);
    Chart.register(ChartDataLabels);
    Chart.defaults.animation = false;
    Chart.defaults.responsive = false;

    const canvas = createCanvas(1000, 1000);

    let data = {
        labels: [],
        datasets: [{
            label: 'scores',
            data: [],
            backgroundColor: [],
        }],
    };

    user_message_count.forEach((count, user_id) => {
        data.labels.push(user_id_to_user.get(user_id).name,);
        data.datasets[0].data.push(count);
        data.datasets[0].backgroundColor.push(stringToColour(user_id));
    })

    new Chart(canvas as unknown as HTMLCanvasElement, {
        type: 'bar',
        data,
        options: {
            indexAxis: 'y',
            plugins: {
                datalabels: {
                    color: '#ffffff',
                    anchor: 'end',
                    align: 'end',
                    font: {
                        weight: 'bold',
                        size: 24,
                    },
                },
                legend: {
                    display: false,
                }
            },
            scales: {
                y: {
                    border: {
                        display: false,
                    },
                    ticks: {
                        font: {
                            weight: 'bold',
                            size: 30,
                        },
                        color: '#ffffff',
                    },
                    grid: {
                        display: false,
                    }
                },
                x: {
                    border: {
                        display: false,
                    },
                    ticks: {
                        display: false,
                    },
                    grid: {
                        display: false,
                    }
                }
            },
        }
    });

    return canvas;
}

export async function create_leaderboard_embed(user_scores: Map<string, number>, user_id_to_user: Map<string, StoredUser>, channel_id: string): Promise<LeaderboardEmbed> {
    let leaderboard_canvas = await create_leaderboard_chart(user_scores, user_id_to_user);

    const out = fs.createWriteStream('./images/' + channel_id + '/leaderboard.png');

    const thumbnail_file = new AttachmentBuilder('./images/amogus_thumbnail.jpg');

    const embed_object = {
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
            text: 'Amogus corporate \@2023',
            icon_url: 'attachment://amogus_thumbnail.jpg',
        },
    };

    const leaderboard_chart = await new Promise<AttachmentBuilder>((resolve, reject) => {
        out.on('open', () => {
            const stream = leaderboard_canvas.createPNGStream();
            stream.on('data', chunk => { out.write(chunk); });
            stream.on('error', (err) => { reject(err); });
            stream.on('end', () => {
                resolve(new AttachmentBuilder('./images/' + channel_id + '/leaderboard.png'));
            });
        });
        out.on('error', (err) => { reject(err); });
    });

    return { embed_object, thumbnail_file, leaderboard_chart };
}

export async function update_stored_leaderboard(user_scores: Map<string, number>, message: Message): Promise<Map<string, number>> {
    if (user_scores.has(message.author.id)) {
        user_scores.set(message.author.id, user_scores.get(message.author.id) + 1);
    } else {
        user_scores.set(message.author.id, 1);
    }

    user_scores = new Map([...user_scores.entries()].sort((a, b) => b[1] - a[1]));

    await ChannelModel.updateOne({ id: message.channelId }, { leaderboard: user_scores });

    return user_scores;
}

export function create_streak_embed(max_streak: [string, number | Number], current_streak: [string, number | Number], user_id_to_user: Map<string, StoredUser>): StreakEmbed {
    const embed_object = {
        color: 0xB4E599,
        title: 'Streaks',
        fields: [
            {
                name: 'Longest streak :crown:',
                value: `${user_id_to_user.get(max_streak[0]).name}: ${max_streak[1]} :fire:`,
                inline: false
            },
            {
                name: 'Current streak',
                value: `${user_id_to_user.get(current_streak[0]).name}: ${current_streak[1]} :fire:`,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Amogus corporate \@2023',
        },
    };

    return { embed_object };
}

export async function update_stored_streaks(channel: StoredChannel, message: Message, previous_valid_message: StoredMessage): Promise<Streaks> {
    let current_streak = channel.current_streak;
    let max_streak = channel.max_streak;

    if (previous_valid_message.author_id === message.author.id && isNextDay(new Date(message.createdTimestamp), new Date(previous_valid_message.timestamp))) {
        current_streak[1] = current_streak[1] + 1;
        console.log(current_streak);
    } else {
        current_streak = [message.author.id, 1];
    }
    if (current_streak[1] > max_streak[1]) {
        max_streak = current_streak;
    }

    await ChannelModel.updateOne({ id: message.channelId }, { current_streak, max_streak });

    return {
        max_streak,
        current_streak,
    }
}

var stringToColour = function (str: string) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}