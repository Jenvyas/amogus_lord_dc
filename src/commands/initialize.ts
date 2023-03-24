import { ChannelType, SlashCommandBuilder, TextChannel, 
    User, Message, Collection, ChatInputCommandInteraction } from 'discord.js';

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
        } catch (error) {
            interaction.editReply("There was a problem retrieving the messages.");
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
        interaction.editReply("ok");
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



