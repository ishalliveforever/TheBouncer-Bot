const { Client, GatewayIntentBits } = require('discord.js');

// Create a new client instance with intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

require('dotenv').config();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    console.log("Message received"); // Log when any message is received
    if (message.author.bot) return; // Ignore messages from bots
    if (!message.guild) return; // Ensure the message is in a guild

    console.log("Processing message from a user in a guild");
    // Ensure the message is from the specific bot (adjust the ID to the correct one)
    if (message.author.id !== 'specific_bot_user_id') return;
    console.log("Message is from the specific bot");

    if (message.embeds.length > 0 && message.embeds[0].title.includes('Verification Successful')) {
        console.log("Found a verification success message");
        const embed = message.embeds[0];
        const description = embed.description;
        const usernameMatch = /Username: (\w+) has been assigned roles:/.exec(description);
        const rolesMatch = /assigned roles: (.+)/.exec(description);

        if (!usernameMatch || !rolesMatch) {
            console.log("Could not parse the message correctly.");
            return;
        }

        const username = usernameMatch[1];
        const rolesList = rolesMatch[1].split(', ');
        console.log(`Assigning roles ${rolesList} to user ${username}`);

        const members = await message.guild.members.fetch({ query: username, limit: 1 });
        if (members.size === 0) {
            console.log("User not found in the guild.");
            return;
        }

        const user = members.first();
        const roleIds = {
            'Grand Tardinians': process.env.GRAND_TARDINIANS_ROLE_ID,
            '0Face': process.env.ZERO_FACE_ROLE_ID,
            'Pixel Foxes': process.env.PIXEL_FOXES_ROLE_ID
        };

        for (let roleName of rolesList) {
            const roleNameTrimmed = roleName.trim();
            const roleId = roleIds[roleNameTrimmed];
            if (roleId && user) {
                const role = message.guild.roles.cache.get(roleId);
                if (role) {
                    await user.roles.add(role);
                    console.log(`Role ${roleNameTrimmed} has been successfully assigned to ${user.displayName}.`);
                } else {
                    console.log(`Role ${roleNameTrimmed} not found in the guild.`);
                }
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
