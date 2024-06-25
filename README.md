# The Bouncer Bot

The Bouncer Bot is a Discord bot designed to manage user roles based on their holdings in specific NFT collections on the Bitcoin SV (BSV) blockchain. It integrates with the Panda Wallet and uses cron jobs to periodically check user holdings and update their roles accordingly.

## Features
- Manage user roles based on their NFT holdings.
- Periodically check user holdings and update roles.
- Provide collection stats via Discord commands.

## Prerequisites
- Node.js 14+
- Discord account and server
- Panda Wallet extension installed in your browser

## Setup

### Step 1: Clone the Repository
```sh
git clone https://github.com/ishalliveforever/bouncer-bot.git
cd bouncer-bot
```

### Step 2: Install Dependencies
```sh
npm install
```

### Step 3: Set Up Environment Variables
Create a `.env` file in the root directory with the following content:
```plaintext
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_token
DISCORD_GUILD_ID=your_discord_guild_id

# Role IDs
GRAND_TARDINIANS_ROLE_ID=your_grand_tardinians_role_id
ORDER_OF_THE_DELTA_ROLE_ID=your_order_of_the_delta_role_id
ZERO_FACE_ROLE_ID=your_zero_face_role_id
DISTORTION_ROLE_ID=your_distortion_role_id
PIXEL_FOXES_ROLE_ID=your_pixel_foxes_role_id
ICARUS_CORP_ROLE_ID=your_icarus_corp_role_id
GM_PEPE_ROLE_ID=your_gm_pepe_role_id
DRAGON_ARMY_ROLE_ID=your_dragon_army_role_id
OG_FROGS_ROLE_ID=your_og_frogs_role_id
WTF_TOKYO_ROLE_ID=your_wtf_tokyo_role_id
TWETCH_SURVIVORS_ROLE_ID=your_twetch_survivors_role_id
BASED_FROGS_ROLE_ID=your_based_frogs_role_id

# API URLs
SERVER_URL=https://your-server-url.com
API_URL=https://your-api-url.com
```

### Step 4: Run the Bot
```sh
node index.js
```

## Usage

### Flex Command
Use the `/flex` command to display your collection stats.

### Periodic Checks
The bot periodically checks user holdings and updates roles accordingly.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## Donate
## BSV Address: 1AehJyGHnPXMZ2zg4wdBjaowdLTebysFus
## BCH: qrxx9gycn3rrp6pd29p84ez2cceqc93gl5zdvttrjw.
## BTC Address: bc1q5dc49up9k8ne90xn4n6edxd908n8het9maxwhu
## Doge: DJ1pkmDwdLS94ZSEJdVJoq2MHprDfjaUpZ
## Sol: 9HmpAhDoicGehmGhbbN5kmhsd5uZGm2DEDt68cGiUseJ

## License
This project is licensed under the MIT License.
