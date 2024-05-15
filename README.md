Here's a suggested README file that you can use to help others understand how to work with "The Bouncer" Discord bot. This document includes setup instructions, required environment variables, and an overview of what the bot does.

```markdown
# The Bouncer Discord Bot

The Bouncer is a Discord bot designed to monitor messages from specific webhooks and assign roles based on the contents of these messages within the Discord guild. It automates the process of role management based on predefined criteria in the message embeds.

## Features

- **Webhook Monitoring**: Listens to incoming webhook messages.
- **Role Assignment**: Automatically assigns roles based on keywords found in the message embeds.
- **Logging**: Provides detailed logs for debugging and tracking bot activity.

## Setup

### Prerequisites

- Node.js (v16 or higher recommended)
- npm (Node Package Manager)
- A Discord Bot Token
- A Discord server with permissions to manage roles

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-repository/the-bouncer-bot.git
   cd the-bouncer-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory of your project and add the following variables:
   ```plaintext
   DISCORD_TOKEN=your_discord_bot_token_here
   GRAND_TARDINIANS_ROLE_ID=role_id_here
   ORDER_OF_THE_DELTA_ROLE_ID=role_id_here
   ZERO_FACE_ROLE_ID=role_id_here
   PIXEL_FOXES_ROLE_ID=role_id_here
   ```

   Replace `your_discord_bot_token_here` and `role_id_here` with your actual Discord bot token and role IDs.

### Configuration

- **Webhook ID**: The bot is configured to listen to a specific webhook ID. Make sure to replace the webhook ID in the bot code if necessary.

### Running the Bot

To start the bot, run:
```bash
node index.js
```

The console will display a message confirming that the bot has logged in.

## Usage

Once the bot is running, it will automatically listen for messages from the configured webhook. If a message contains an embed with a username and any of the specified keywords (`Grand Tardinians`, `Order of the Delta`, `0Face`, `Pixel Foxes`), it will assign the corresponding role to the user mentioned in the message.

## Contributing

Contributions to the development of The Bouncer are welcome! Please feel free to fork the repository, make your changes, and submit a pull request.

## Support

If you encounter any problems or have suggestions, please open an issue on the GitHub repository page.
