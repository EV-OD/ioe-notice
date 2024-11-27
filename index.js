const dotenv = require('dotenv');
dotenv.config();

const Discord = require('discord.js');
const schedule = require('node-schedule');
const { fetchCurrentNoticesIOE } = require('./pageUtils');
const { setAllNoticeUrls, getAllNoticeUrls, setNoticeUrl } = require('./firebase');

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello World!');
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})

const { Client, GatewayIntentBits } = Discord;

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_NAME = 'test1'; // Replace with the desired channel name

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

let lastNewsUrls = {
    exam: '',
    entrance: '',
    official: '',
    admission: ''
};

// Cache target channels for all servers
let targetChannels = new Map(); // Map of guild ID to channel object

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Initialize the lastNewsUrls from Firebase
    let savedUrls = await getAllNoticeUrls();
    if (savedUrls) lastNewsUrls = savedUrls;

    // Find target channels for all servers
    await findTargetChannels();

    // Start the news checker
    if (targetChannels.size > 0) {
        startNewsChecker();
    } else {
        console.error('No target channels found in any server.');
    }
});

client.login(TOKEN);

// Find target channels in all servers
async function findTargetChannels() {
    try {
        const guilds = client.guilds.cache;

        if (!guilds.size) {
            console.error('The bot is not part of any guild.');
            return;
        }

        for (const [guildId, guild] of guilds) {
            await guild.channels.fetch(); // Fetch all channels for the guild
            const channel = guild.channels.cache.find(
                (ch) => ch.name === CHANNEL_NAME && ch.isTextBased()
            );

            if (channel) {
                targetChannels.set(guildId, channel);
                console.log(`Found channel '${CHANNEL_NAME}' in guild '${guild.name}'`);
            } else {
                console.warn(`Channel '${CHANNEL_NAME}' not found in guild '${guild.name}'`);
            }
        }
    } catch (error) {
        console.error('Error finding target channels:', error);
    }
}

// Check for updates and notify all servers
async function checkForUpdates(noticeType) {
    try {
        const news = await fetchCurrentNoticesIOE(noticeType);
        if (!news || !news[0]) return;

        const latestNews = news[0]; // Assuming the latest news is always the first in the array
        if (latestNews.Url !== lastNewsUrls[noticeType]) {
            lastNewsUrls[noticeType] = latestNews.Url;

            // Save the latest URL to Firestore
            await setNoticeUrl(noticeType, latestNews.Url);
            console.log(`New ${noticeType} notice found:`, latestNews);

            // Send the news to all Discord servers
            sendNewsToDiscord(latestNews, noticeType);
        }
    } catch (error) {
        console.error(`Error checking updates for ${noticeType}:`, error);
    }
}

// Send news to all target channels
function sendNewsToDiscord(news, noticeType) {
    const safeUrl = encodeURI(news.Url);

    const embed = new Discord.EmbedBuilder()
        .setTitle(`📰 New ${capitalizeFirstLetter(noticeType)} Notice!`)
        .setURL(safeUrl)
        .setDescription(news.Description)
        .setColor("#2794be")
        .setFooter({ text: "Powered by SevenX" })
        .setTimestamp();

    // Send the embed to all target channels
    targetChannels.forEach((channel, guildId) => {
        channel.send({ embeds: [embed] }).catch((error) => {
            console.error(`Error sending message to channel in guild '${guildId}':`, error);
        });
    });
}

// Capitalize the first letter of a string
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
            // console.log(`Checking updates for ${type} notices...`);
            // checkForUpdates(type);
    });
}
