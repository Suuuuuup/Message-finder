const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const { token, clientId } = require('./config.json'); 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    registerSlashCommands();
});

async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(token);

    try {
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [
                {
                    name: 'search',
                    description: 'Chercher des messages contenant l\'ID spécifié',
                    options: [
                        {
                            name: 'id',
                            type: 3, // STRING type
                            description: 'L\'ID à chercher',
                            required: true
                        }
                    ]
                }
            ] },
        );
        console.log('Commandes d\'application enregistrées avec succès.');
    } catch (error) {
        console.error(error);
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'search') {
        await interaction.deferReply(); 

        const idToSearch = options.getString('id');
        let mostRecentMessage = null;

        try {
            for (const [guildId, guild] of client.guilds.cache) {
                for (const [channelId, channel] of guild.channels.cache) {
                    if (channel.isTextBased()) {
                        try {
                            const messages = await channel.messages.fetch({ limit: 100 });
                            const foundMessages = messages.filter(m => m.content.includes(idToSearch));

                            if (foundMessages.size > 0) {
                                const recentMessage = foundMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp).first();
                                if (!mostRecentMessage || recentMessage.createdTimestamp > mostRecentMessage.createdTimestamp) {
                                    mostRecentMessage = recentMessage;
                                }
                            }
                        } catch (err) {
                            console.error(`Échec de la récupération des messages dans le salon ${channel.id} :`, err);
                        }
                    }
                }
            }

            if (mostRecentMessage) {
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('Message trouvé')
                    .setURL(mostRecentMessage.url)
                    .setAuthor({ name: mostRecentMessage.author.tag, iconURL: mostRecentMessage.author.displayAvatarURL() })
                    .setDescription(mostRecentMessage.content)
                    .setTimestamp(mostRecentMessage.createdAt);

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply(`Aucun message trouvé avec l'ID \`${idToSearch}\``);
            }
        } catch (error) {
            console.error('Erreur lors de la recherche de messages :', error);
            await interaction.editReply('Une erreur est survenue lors de la recherche des messages.');
        }
    }
});

client.login(token);
