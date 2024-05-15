const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Creating a new client instance with necessary intents for managing messages and guild information
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Event listener for when the bot is successfully logged in
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event listener for new messages
client.on('messageCreate', async message => {
    // Check if the message is from the specified webhook and contains embeds
    if (message.webhookId === '1236859458932707409' && message.embeds.length > 0) {
        const embed = message.embeds[0]; // Taking the first embed
        console.log('Processing embed from a webhook message.');

        // Extracting username from the embed description using a regular expression
        const descriptionText = embed.description;
        const usernameMatch = descriptionText.match(/Username:\s*(\w+)/i);
        if (!usernameMatch) {
            console.log('No username found in the embed description.');
            return;
        }
        const username = usernameMatch[1];
        console.log(`Extracted username from embed: ${username}`);

        // Attempt to fetch the member from the guild based on the username
        let member;
        try {
            const members = await message.guild.members.fetch({query: username, limit: 1});
            member = members.first();
            if (!member) {
                console.log(`Member not found for username: ${username}`);
                return;
            }
            console.log(`Found member: ${member.user.tag}`);
        } catch (error) {
            console.error(`Error fetching members:`, error);
            return;
        }

        // Role mapping based on keywords found in the embed description
        const rolesToAssign = {
            "Grand Tardinians": process.env.GRAND_TARDINIANS_ROLE_ID,
            "Order of the Delta": process.env.ORDER_OF_THE_DELTA_ROLE_ID,
            "0Face": process.env.ZERO_FACE_ROLE_ID,
            "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID
        };

        // Assigning roles based on presence of keywords in the embed description
        Object.entries(rolesToAssign).forEach(async ([key, roleId]) => {
            if (descriptionText.includes(key)) {
                console.log(`Role keyword '${key}' found in embed description, attempting to assign role.`);
                const role = message.guild.roles.cache.get(roleId);
                if (!role) {
                    console.log(`Role '${key}' not found with ID ${roleId}.`);
                    return;
                }

                try {
                    await member.roles.add(role);
                    console.log(`Assigned '${key}' role to ${username}`);
                } catch (error) {
                    console.error(`Failed to assign role '${key}' to ${username}:`, error);
                }
            }
        });
    }
});

// Bot login using the token from the environment variables
client.login(process.env.DISCORD_TOKEN);
