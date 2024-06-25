const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

// Configure the Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Collection IDs for checking user holdings
const COLLECTION_IDS = {
    "Grand Tardinians": "your_collection_id_1",
    "Order of the Delta": "your_collection_id_2",
    "0Face": "your_collection_id_3",
    "Distortion": "your_collection_id_4",
    "Icarus Corp": "your_collection_id_5",
    "GM Pepes": "your_collection_id_6",
    "Dragon Army": "your_collection_id_7",
    "Pixel Foxes": "your_collection_id_8",
    "OG Frogs": "your_collection_id_9",
    "WTF TOKYO": "your_collection_id_10",
    "Twetch Survivors": "your_collection_id_11",
    "Based Frogs": "your_collection_id_12"
};

// Desired traits for Pixel Foxes collection
const DESIRED_FOX_BODY_TRAITS = ["Common Cozy", "Uncommon Cozy", "Rare Cozy", "Epic Cozy", "Legendary Cozy", "Exotic Cozy"];

// Load current index from file for cron job
let fetch;
let currentIndex = 0;
const path = './currentIndex.txt';

const loadCurrentIndex = () => {
    try {
        if (fs.existsSync(path)) {
            const data = fs.readFileSync(path, 'utf8');
            currentIndex = parseInt(data, 10);
            if (isNaN(currentIndex)) {
                currentIndex = 0;
            }
        }
    } catch (error) {
        console.error("Failed to load current index:", error);
    }
};

const saveCurrentIndex = () => {
    try {
        fs.writeFileSync(path, currentIndex.toString(), 'utf8');
    } catch (error) {
        console.error("Failed to save current index:", error);
    }
};

loadCurrentIndex();

// Event handler for when the bot is ready
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    try {
        fetch = (await import('node-fetch')).default;
        console.log("Fetch module dynamically imported.");
    } catch (error) {
        console.error("Failed to import fetch module dynamically:", error);
    }

    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.commands.create({
        name: 'flex',
        description: 'Display your collection stats'
    });

    let users = [];

    const loadUsers = async () => {
        try {
            const response = await fetch(`${process.env.SERVER_URL}/show_users`);
            const text = await response.text();
            users = text.split('<br>').filter(line => line.trim()).map(line => {
                return line.split(',').reduce((acc, part) => {
                    const [key, value] = part.split(':').map(p => p.trim());
                    acc[key] = value;
                    return acc;
                }, {});
            });
            console.log(`Loaded ${users.length} users.`);
        } catch (error) {
            console.error("Failed to load users:", error);
        }
    };

    await loadUsers();
    cron.schedule('0 * * * *', loadUsers);

    cron.schedule('*/30 * * * *', async () => {
        if (users.length === 0) {
            console.log('No users to process.');
            return;
        }

        const user = users[currentIndex];
        currentIndex = (currentIndex + 1) % users.length;
        saveCurrentIndex();

        if (user['ORD Address'] && user['ORD Address'] !== 'Not set') {
            console.log(`Checking ORD Address for user: ${user.Username}`);
            await checkUserOrdinals(user['ORD Address'], user.Username);
        } else {
            console.log(`ORD Address not set or invalid for user ${user.Username}, skipping.`);
        }
    }, {
        scheduled: true,
        timezone: "UTC"
    });
});

// Event handler for incoming messages
client.on('messageCreate', async message => {
    if (message.webhookId && message.embeds.length > 0) {
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
        await updateRolesBasedOnEmbed(descriptionText, member);
    }
});

async function fetchMember(guild, username) {
    try {
        const members = await guild.members.fetch({
            query: username,
            limit: 1
        });
        return members.first();
    } catch (error) {
        console.error(`Error fetching member by username ${username}:`, error);
        return null;
    }
}

const checkUserOrdinals = async (ordAddress, username) => {
    console.log(`Checking collections for username: ${username}, address: ${ordAddress}`);
    const userCollections = [];
    const maxRetries = 3;

    for (const [name, collectionId] of Object.entries(COLLECTION_IDS)) {
        if (name === "Pixel Foxes") continue;

        try {
            const response = await fetchWithRetry(`${process.env.API_URL}/collections/${collectionId}/holders`, {}, maxRetries);
            const holders = await response.json();
            if (holders.some(holder => holder.address === ordAddress)) {
                userCollections.push(name);
                console.log(`User ${username} holds collection: ${name}`);
            }
        } catch (error) {
            console.error(`Error checking collection ${name} for user ${username}:`, error);
        }
    }

    try {
        const foxCount = await getPixelFoxCount(ordAddress);
        if (foxCount > 0) {
            userCollections.push("Pixel Foxes");
            console.log(`User ${username} holds Pixel Foxes: ${foxCount}`);
        }
    } catch (error) {
        console.error(`Error checking Pixel Foxes for user ${username}:`, error);
    }

    await updateDiscordRoles(username, userCollections);
};

async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            throw new Error(`Request failed with status ${response.status}`);
        } catch (error) {
            console.error(`Fetch error: ${error.message}. Retrying (${i + 1}/${retries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    console.error(`Failed to fetch ${url} after ${retries} retries.`);
}

async function fetchAllUnspentTxos(ordAddress) {
    let offset = 0;
    const limit = 100;
    const maxConcurrentRequests = 15;
    let allTxos = [];

    const fetchBatch = async (batchOffset) => {
        const response = await fetchWithRetry(`${process.env.API_URL}/txos/address/${ordAddress}/unspent?limit=${limit}&offset=${batchOffset}`);
        if (!response.ok) throw new Error(`Failed to fetch unspent transactions for address: ${ordAddress}`);
        return await response.json();
    };

    while (true) {
        const batchPromises = [];
        for (let i = 0; i < maxConcurrentRequests; i++) {
            batchPromises.push(fetchBatch(offset + i * limit));
        }

        const batchResults = await Promise.all(batchPromises);
        let noMoreResults = true;
        for (const result of batchResults) {
            allTxos = allTxos.concat(result);
            if (result.length === limit) {
                noMoreResults = false;
            }
        }

        if (noMoreResults) break;
        offset += maxConcurrentRequests * limit;
    }

    return allTxos;
}

async function getPixelFoxCount(ordAddress) {
    const unspentTxos = await fetchAllUnspentTxos(ordAddress);
    let foxCount = 0;

    unspentTxos.forEach(tx => {
        const { data } = tx;
        if (data && data.map) {
            const { map } = data;
            const { collectionId, traits } = map.subTypeData || {};
            if (collectionId === COLLECTION_IDS["Pixel Foxes"]) {
                const bodyTrait = traits.find(trait => trait.name === "body");
                if (bodyTrait && DESIRED_FOX_BODY_TRAITS.includes(bodyTrait.value)) {
                    foxCount++;
                }
            }
        }
    });

    return foxCount;
}

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
        "Distortion": process.env.DISTORTION_ROLE_ID,
        "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID,
        "Icarus Corp": process.env.ICARUS_CORP_ROLE_ID,
        "GM Pepes": process.env.GM_PEPE_ROLE_ID,
        "Dragon Army": process.env.DRAGON_ARMY_ROLE_ID,
        "OG Frogs": process.env.OG_FROGS_ROLE_ID,
        "WTF TOKYO": process.env.WTF_TOKYO_ROLE_ID,
        "Twetch Survivors": process.env.TWETCH_SURVIVORS_ROLE_ID,
        "Based Frogs": process.env.BASED_FROGS_ROLE_ID
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

async function updateRolesBasedOnEmbed(descriptionText, member) {
    const rolesToAssign = {
        "Grand Tardinians": process.env.GRAND_TARDINIANS_ROLE_ID,
        "Order of the Delta": process.env.ORDER_OF_THE_DELTA_ROLE_ID,
        "0Face": process.env.ZERO_FACE_ROLE_ID,
        "Distortion": process.env.DISTORTION_ROLE_ID,
        "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID,
        "Icarus Corp": process.env.ICARUS_CORP_ROLE_ID,
        "GM Pepes": process.env.GM_PEPE_ROLE_ID,
        "Dragon Army": process.env.DRAGON_ARMY_ROLE_ID,
        "OG Frogs": process.env.OG_FROGS_ROLE_ID,
        "WTF TOKYO": process.env.WTF_TOKYO_ROLE_ID,
        "Twetch Survivors": process.env.TWETCH_SURVIVORS_ROLE_ID,
        "Based Frogs": process.env.BASED_FROGS_ROLE_ID
    };

    for (const [key, roleId] of Object.entries(rolesToAssign)) {
        if (descriptionText.includes(key)) {
            console.log(`Embed contains keyword '${key}', assigning role.`);
            const role = member.guild.roles.cache.get(roleId);
            if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
                console.log(`Assigned '${key}' role to ${member.user.tag}`);
            }
        }
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    if (commandName === 'flex') {
        await handleFlexCommand(interaction);
    }
});

async function handleFlexCommand(interaction) {
    await interaction.deferReply();

    const username = interaction.user.username;
    const ordAddress = await getOrdAddressForUser(username);
    if (!ordAddress) {
        await interaction.followUp(`No ORD address set for user ${username}.`);
        return;
    }
    const userStats = await getUserStats(ordAddress);
    const embed = new EmbedBuilder()
        .setTitle(`💪🏼 **${username}'s Collection Stats**`)
        .setColor('#5865F2')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: 'Collection Stats provided by The Bouncer Bot',
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

    userStats.forEach(stat => {
        const collectionName = stat.collection === "Pixel Foxes" ? "Cozy Foxes" : stat.collection;
        embed.addFields({
            name: `**${collectionName}**`,
            value: `${stat.amount} items (${stat.percentage.toFixed(2)}% 💪🏼)`,
            inline: false
        });
    });

    await interaction.followUp({ embeds: [embed] });
}

async function getOrdAddressForUser(username) {
    try {
        const response = await fetchWithRetry(`${process.env.SERVER_URL}/show_users`);
        const text = await response.text();
        const lines = text.split('<br>').filter(line => line.trim());
        const userLine = lines.find(line => line.includes(`Username: ${username}`));
        if (userLine) {
            const parts = userLine.split(',').reduce((acc, part) => {
                const [key, value] = part.split(':').map(p => p.trim());
                acc[key] = value;
                return acc;
            }, {});
            return parts['ORD Address'] !== 'Not set' ? parts['ORD Address'] : null;
        }
    } catch (error) {
        console.error(`Error fetching ORD address for username ${username}:`, error);
    }
    return null;
}

async function getUserStats(ordAddress) {
    const stats = [];

    for (const [collection, collectionId] of Object.entries(COLLECTION_IDS)) {
        if (collection === "Pixel Foxes") {
            try {
                const foxCount = await getPixelFoxCount(ordAddress);
                stats.push({
                    collection: "Cozy Foxes",
                    amount: foxCount,
                    percentage: 0
                });
            } catch (error) {
                console.error(`Error fetching stats for collection ${collection}:`, error);
            }
        } else {
            try {
                const response = await fetchWithRetry(`${process.env.API_URL}/collections/${collectionId}/holders`);
                const holders = await response.json();
                const totalItems = holders.reduce((sum, holder) => sum + parseInt(holder.amt), 0);
                const userHolder = holders.find(holder => holder.address === ordAddress);
                const amount = userHolder ? parseInt(userHolder.amt) : 0;
                const percentage = totalItems > 0 ? (amount / totalItems) * 100 : 0;
                stats.push({
                    collection,
                    amount,
                    percentage
                });
            } catch (error) {
                console.error(`Error fetching stats for collection ${collection}:`, error);
            }
        }
    }

    return stats;
}

client.login(process.env.DISCORD_TOKEN);

