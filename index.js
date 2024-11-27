const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const schedule = require('node-schedule');
const { fetchCurrentNoticesIOE } = require('./pageUtils');

const { Client, GatewayIntentBits } = Discord;

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_NAME = 'test1'; // Replace with the desired channel name

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Store the last URLs for each notice type
let lastNewsUrls = {
    exam: '',
    entrance: '',
    official: '',
    admission: ''
};

let targetChannel; // Cache the target channel

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Dynamically find the channel by name
    try {
        const guild = client.guilds.cache.first(); // Get the first guild the bot is in (adjust if the bot is in multiple guilds)
        if (!guild) {
            console.error('No guild found.');
            return;
        }

        targetChannel = guild.channels.cache.find((ch) => ch.name === CHANNEL_NAME && ch.isTextBased());
        if (!targetChannel) {
            console.error(`Channel '${CHANNEL_NAME}' not found.`);
            return;
        }

        console.log(`Using channel: ${targetChannel.name}`);
        startNewsChecker();
    } catch (error) {
        console.error('Error setting up the bot:', error);
    }
});

client.login(TOKEN);

// Function to fetch and check news for a specific type
async function checkForUpdates(noticeType) {
    try {
        const news = await fetchCurrentNoticesIOE(noticeType);
        if (!news || !news[0]) return;

        const latestNews = news[0]; // Assuming the latest news is always the first in the array
        if (latestNews.Url !== lastNewsUrls[noticeType]) {
            lastNewsUrls[noticeType] = latestNews.Url;
            sendNewsToDiscord(latestNews, noticeType);
        }
    } catch (error) {
        console.error(`Error checking updates for ${noticeType}:`, error);
    }
}

// Function to send news to Discord
function sendNewsToDiscord(news, noticeType) {
    if (!targetChannel) {
        console.error('Target channel is not set.');
        return;
    }

    const safeUrl = encodeURI(news.Url);

    const embed = new Discord.EmbedBuilder()
        .setTitle(`📰 New ${capitalizeFirstLetter(noticeType)} Notice!`)
        .setURL(safeUrl)
        .setDescription(news.Description)
        .setColor("#2794be")
        .setFooter({ text: "Powered by SevenX" })
        .setTimestamp();

    targetChannel.send({ embeds: [embed] });
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Schedule tasks for all notice types
function startNewsChecker() {
    const noticeTypes = ['exam', 'entrance', 'official', 'admission'];

    noticeTypes.forEach((type) => {
        schedule.scheduleJob('*/5 * * * *', () => {
            console.log(`Checking updates for ${type} notices...`);
            checkForUpdates(type);
        });
    });
}
