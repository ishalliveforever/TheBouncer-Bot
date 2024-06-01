onst { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
    "Pixel Foxes": "1611d956f397caa80b56bc148b4bce87b54f39b234aeca4668b4d5a7785eb9fa_0",
    "Distortion": "4c6c1a8e6dda987aaf61c9742214b6bba0cc2fe95fd3867062d24e7a71a62ca3_0",
    "Icarus Corp": "96825f746efb7bbc7e736d24d86d91f5c9bb94e680faa72142931226cd3290de_0",
    "GM Pepes": "2db5261b58f51261594ce3dd7847a02f9ad652ed6d1af9458c1f43687b65ae87_0"
};

let fetch;

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    fetch = (await import('node-fetch')).default;
    console.log("Fetch module dynamically imported.");

    // Register slash commands
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.commands.create({
        name: 'flex',
        description: 'Display your collection stats'
    });
    await guild.commands.create({
        name: 'rank',
        description: 'Display leaderboard for a collection',
        options: [
 {
                name: 'collection',
                type: 3,  // The correct type for a STRING is 3
                description: 'The collection to display the leaderboard for',
                required: true,
                choices: Object.keys(COLLECTION_IDS).map(name => ({ name, value: name }))
            }
        ]
    });
    await guild.commands.create({
        name: 'topgun',
        description: 'Show the top collectors in terms of total items across all collections'
    });

    // Modify the cron schedule to run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log("Running scheduled wallet check...");
        try {
            const response = await fetch('http://1satsociety.com:5000/show_users');
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
        "Distortion": process.env.DISTORTION_ROLE_ID,
        "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID,
        "Icarus Corp": process.env.ICARUS_CORP_ROLE_ID,
         "GM Pepes": process.env.GM_PEPE_ROLE_ID
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
        "Distortion": process.env.DISTORTION_ROLE_ID,
        "Pixel Foxes": process.env.PIXEL_FOXES_ROLE_ID,
        "Icarus Corp": process.env.ICARUS_CORP_ROLE_ID,
        "GM Pepes": process.env.GM_PEPE_ROLE_ID
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

// New commands

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    await interaction.deferReply(); // Acknowledge the interaction immediately

    const { commandName, options } = interaction;
    if (commandName === 'flex') {
        await handleFlexCommand(interaction);
    } else if (commandName === 'rank') {
        const collection = options.getString('collection');
        await handleRankCommand(interaction, collection);
    } else if (commandName === 'topgun') {
        await handleTopGunCommand(interaction);
    }
});

async function handleFlexCommand(interaction) {
    const username = interaction.user.username;
    const ordAddress = await getOrdAddressForUser(username);
    if (!ordAddress) {
        await interaction.followUp(`No ORD address set for user ${username}.`);
        return;
    }

    const userStats = await getUserStats(ordAddress);
    const embed = new EmbedBuilder()
        .setTitle(`💪🏼 **${username}'s Collection Stats**`)
        .setColor('#5865F2')  // Discord blue color
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Collection Stats provided by The Bouncer Bot', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    userStats.forEach(stat => {
        embed.addFields({ name: `**${stat.collection}**`, value: `${stat.amount} items (${stat.percentage.toFixed(2)}% 💪🏼)`, inline: false });
    });

    await interaction.followUp({ embeds: [embed] });
}

async function handleRankCommand(interaction, collection) {
    const leaderboard = await getLeaderboard(collection);
    const embed = new EmbedBuilder()
        .setTitle(`🚀 **${collection} Leaderboard** 🚀`)
        .setColor('#5865F2')  // Discord blue color
        .setFooter({ text: 'Leaderboard provided by The Bouncer Bot', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    leaderboard.forEach((entry, index) => {
        embed.addFields({ name: `**${index + 1}. ${entry.username}**`, value: `${entry.amount} items (${entry.percentage.toFixed(2)}% 💰)`, inline: false });
    });

    await interaction.followUp({ embeds: [embed] });
}

async function handleTopGunCommand(interaction) {
    const topCollectors = await getTopCollectors();
    const embed = new EmbedBuilder()
        .setTitle('👀 **Top Collectors Across All Collections** 👀')
        .setColor('#5865F2')  // Discord blue color
        .setFooter({ text: 'Top Collectors provided by The Bouncer Bot', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    topCollectors.forEach((collector, index) => {
        embed.addFields({ name: `**${index + 1}. ${collector.username}**`, value: `${collector.totalItems} items (${collector.totalPercentage.toFixed(2)}% 💰)`, inline: false });
    });

    await interaction.followUp({ embeds: [embed] });
}

async function getOrdAddressForUser(username) {
    try {
        const response = await fetch('http://1satsociety.com/show_users');
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
        try {
            const response = await fetch(`https://ordinals.gorillapool.io/api/collections/${collectionId}/holders`);
            const holders = await response.json();
            const totalItems = holders.reduce((sum, holder) => sum + parseInt(holder.amt), 0);
            const userHolder = holders.find(holder => holder.address === ordAddress);
            const amount = userHolder ? parseInt(userHolder.amt) : 0;
            const percentage = totalItems > 0 ? (amount / totalItems) * 100 : 0;
            stats.push({ collection, amount, percentage });
        } catch (error) {
            console.error(`Error fetching stats for collection ${collection}:`, error);
        }
    }

    return stats;
}

async function getLeaderboard(collection) {
    const collectionId = COLLECTION_IDS[collection];
    if (!collectionId) return [];
try {
        const response = await fetch(`https://ordinals.gorillapool.io/api/collections/${collectionId}/holders`);
        const holders = await response.json();
        const totalItems = holders.reduce((sum, holder) => sum + parseInt(holder.amt), 0);

        // Fetch user data for mapping addresses to usernames
        const userResponse = await fetch('http://1satsociety.com/show_users');
        const userText = await userResponse.text();
        const userLines = userText.split('<br>').filter(line => line.trim());
        const userMap = userLines.reduce((acc, line) => {
            const parts = line.split(',').reduce((acc, part) => {
                const [key, value] = part.split(':').map(p => p.trim());
                acc[key] = value;
                return acc;
            }, {});
            if (parts['ORD Address'] && parts['ORD Address'] !== 'Not set') {
                acc[parts['ORD Address']] = parts['Username'];
            }
            return acc;
        }, {});

        // Filter holders to include only those in the user map
        const filteredHolders = holders.filter(holder => userMap[holder.address]);

        const leaderboard = filteredHolders.map(holder => {
            const amount = parseInt(holder.amt);
            const percentage = totalItems > 0 ? (amount / totalItems) * 100 : 0;
            return {
                username: userMap[holder.address] || 'undefined',
                amount,
                percentage
            };
        });

        return leaderboard.sort((a, b) => b.amount - a.amount).slice(0, Math.min(10, leaderboard.length));
    } catch (error) {
        console.error(`Error fetching leaderboard for collection ${collection}:`, error);
        return [];
    }
    }

async function getTopCollectors() {
    const collectors = [];
    const userMap = {};

    try {
        const userResponse = await fetch('http://1satsociety.com/show_users');
        const userText = await userResponse.text();
        const userLines = userText.split('<br>').filter(line => line.trim());
        userLines.forEach(line => {
            const parts = line.split(',').reduce((acc, part) => {
                const [key, value] = part.split(':').map(p => p.trim());
                acc[key] = value;
                return acc;
            }, {});
            if (parts['ORD Address'] && parts['ORD Address'] !== 'Not set') {
                userMap[parts['ORD Address']] = parts['Username'];
            }
        });

        for (const collectionId of Object.values(COLLECTION_IDS)) {
            const response = await fetch(`https://ordinals.gorillapool.io/api/collections/${collectionId}/holders`);
            const holders = await response.json();

            holders.forEach(holder => {
                if (userMap[holder.address]) {
                    if (!collectors[holder.address]) {
                        collectors[holder.address] = { username: userMap[holder.address], totalItems: 0, totalPercentage: 0 };
                    }
                    const amount = parseInt(holder.amt);
                    const totalItems = holders.reduce((sum, holder) => sum + parseInt(holder.amt), 0);
                    const percentage = totalItems > 0 ? (amount / totalItems) * 100 : 0;

                    collectors[holder.address].totalItems += amount;
                    collectors[holder.address].totalPercentage += percentage;
                }
            });
        }

        
        const sortedCollectors = Object.values(collectors).sort((a, b) => b.totalItems - a.totalItems).slice(0, Math.min(10, Object.values(collectors).length));
        return sortedCollectors;
    } catch (error) {
        console.error(`Error fetching top collectors:`, error);
        return [];
    }
}

client.login(process.env.DISCORD_TOKEN);

