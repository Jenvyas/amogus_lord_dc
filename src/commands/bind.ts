import { SlashCommandBuilder } from 'discord.js';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Binds the amogus statistics to channel.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply('ok');
    }
};