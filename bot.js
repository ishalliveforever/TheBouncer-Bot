const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const COLLECTION_IDS = {
    "Grand Tardinians": "f099182e168c0a30a9f97556d156c8b6284cfc3f76eca8352807b1ceff29da04_0",
    "Order of the Delta": "217c6fa01e2d59e04138e117198635f750685aca771d1d3e5c808e4bf694df78_0",
    "0Face": "cc274a2cc28d88f24a7442443b5542fefe95e486f81f4261e0649401eec30c5d_0",
    "Pixel Foxes": "1611d956f397caa80b56bc148b4bce87b54f39b234aeca4668b4d5a7785eb9fa_0"
};

let fetch;

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    fetch = (await import('node-fetch')).default;
    console.log("Fetch module dynamically imported.");

   // Modify the cron schedule to run every 6 hours
cron.schedule('0 */6 * * *', async () => {
    console.log("Running scheduled wallet check...");
    try {
        const response = await fetch('https://fantastic-space-couscous-w4q9gr5prrwfjwj-5000.app.github.dev/show_users');
        const text = await response.text();
        const lines = text.split('<br>').filter(line => line.trim());
        console.log(`Processing ${lines.length} users.`);
        lines.forEach(line => {
            const parts = line.split(',').reduce((acc, part) => {
                const [key, value] = part.split(':').map(p => p.trim());
                acc[key] = value;
                return acc;
            }, {});

            if (parts['ORD Address'] && parts['ORD Address'] !== 'Not set') {
                console.log(`Checking ORD Address for user: ${parts.Username}`);
                checkUserOrdinals(parts['ORD Address'], parts.Username);
            } else {
                console.log(`ORD Address not set or invalid for user ${parts.Username}, skipping.`);
            }
        });
    } catch (error) {
        console.error("Failed to fetch or process users:", error);
    }
}, {
    scheduled: true,
    timezone: "UTC"
});
});

client.on('messageCreate', async message => {
    if (message.webhookId === '1236859458932707409' && message.embeds.length > 0) {
        const embed = message.embeds[0];
        const descriptionText = embed.description;
        console.log("Processing webhook message...");

        const usernameMatch = descriptionText.match(/Username:\s*(\w+)/i);
        if (!usernameMatch) {
            console.log('No username found in the embed description.');
            return;
        }

        const username = usernameMatch[1];
        const member = await fetchMember(message.guild, username);
        if (!member) {
            console.log(`No member found with username ${username}`);
            return;
        }

        console.log(`Member ${username} found, updating roles based on embed...`);
        updateRolesBasedOnEmbed(descriptionText, member);
    }
});

async function fetchMember(guild, username) {
    try {
        const members = await guild.members.fetch({ query: username, limit: 1 });
        return members.first();
    } catch (error) {
        console.error(`Error fetching member by username ${username}:`, error);
        return null;
    }
}

const checkUserOrdinals = async (ordAddress, username) => {
    console.log(`Checking collections for username: ${username}, address: ${ordAddress}`);
    const userCollections = [];

    for (const [name, collectionId] of Object.entries(COLLECTION_IDS)) {
        try {
            const response = await fetch(`https://ordinals.gorillapool.io/api/collections/${collectionId}/holders`);
            if (!response.ok) throw new Error(`Failed to fetch holders for collection: ${name}`);
            const holders = await response.json();
            if (holders.some(holder => holder.address === ordAddress)) {
                userCollections.push(name);
                console.log(`User ${username} holds collection: ${name}`);
            }
        } catch (error) {
            console.error(`Error checking collection ${name} for user ${username}:`, error);
        }
    }

    updateDiscordRoles(username, userCollections);
};

async function updateDiscordRoles(username, userCollections) {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const member = await fetchMember(guild, username);
    if (!member) {
        console.error(`No member found with username: ${username}`);
        return;
    }

    console.log(`Updating roles for ${username} based on collections...`);
    const rolesToManage = {
        "Grand Tardinians": process.env.GRAND_TARDINIANS_ROLE_ID,
        "Order of the Delta": process.env.ORDER_OF_THE_DELTA_ROLE_ID,
        "0Face": process.env.ZERO_FACE_ROLE_ID,
        "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID
    };

    for (const [collectionName, roleId] of Object.entries(rolesToManage)) {
        const role = member.guild.roles.cache.get(roleId);
        const shouldHaveRole = userCollections.includes(collectionName);
        const hasRole = member.roles.cache.has(roleId);

        if (shouldHaveRole && !hasRole) {
            await member.roles.add(role);
            console.log(`Added role '${collectionName}' to ${username}`);
        } else if (!shouldHaveRole && hasRole) {
            await member.roles.remove(role);
            console.log(`Removed role '${collectionName}' from ${username}`);
        }
    }
}

function updateRolesBasedOnEmbed(descriptionText, member) {
    const rolesToAssign = {
        "Grand Tardinians": process.env.GRAND_TARDINIANS_ROLE_ID,
        "Order of the Delta": process.env.ORDER_OF_THE_DELTA_ROLE_ID,
        "0Face": process.env.ZERO_FACE_ROLE_ID,
        "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID
    };

    Object.entries(rolesToAssign).forEach(async ([key, roleId]) => {
        if (descriptionText.includes(key)) {
            console.log(`Embed contains keyword '${key}', assigning role.`);
            const role = member.guild.roles.cache.get(roleId);
            if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
                console.log(`Assigned '${key}' role to ${member.user.tag}`);
            }
        }
    });
}

client.login(process.env.DISCORD_TOKEN);
