"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
module.exports = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('bind')
        .setDescription('binds the amogus statistics to channel.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        await interaction.editReply('ok');
    }
};
//# sourceMappingURL=bind.js.map