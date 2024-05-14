# TheBouncer Discord Bot

TheBouncer is a Discord bot designed to automate the role assignment process based on verification messages. It listens for verification success messages and assigns corresponding roles to users accordingly.

## Features

- **Automatic Role Assignment**: The bot automatically assigns roles to users based on verification success messages.
- **Flexible Role Mapping**: Roles are assigned based on the information provided in the verification message.
- **Customizable**: Easily configurable through environment variables and simple role mapping.

## Getting Started

To use TheBouncer in your Discord server, follow these steps:

1. **Clone the Repository**: Clone this repository to your local machine using `git clone`.

2. **Install Dependencies**: Run `npm install` to install the required dependencies.

3. **Set Up Environment Variables**: Create a `.env` file in the root directory of the project and define the following environment variables:

   ```
   DISCORD_TOKEN=your_discord_bot_token
   GRAND_TARDINIANS_ROLE_ID=your_grand_tardinians_role_id
   ZERO_FACE_ROLE_ID=your_zero_face_role_id
   PIXEL_FOXES_ROLE_ID=your_pixel_foxes_role_id
   ```

   Replace `your_discord_bot_token`, `your_grand_tardinians_role_id`, `your_zero_face_role_id`, and `your_pixel_foxes_role_id` with your actual Discord bot token and role IDs.

4. **Run the Bot**: Start the bot by running `node bot.js`.

5. **Invite the Bot to Your Server**: Invite the bot to your Discord server using the OAuth2 URL generated for your bot.

6. **Configure Verification Messages**: Configure your verification system to send success messages with the appropriate format for role assignment.

## Usage

Once the bot is running and configured, it will automatically listen for verification success messages and assign roles to users based on the information provided in the messages.

## Contributing

Contributions are welcome! Feel free to open issues and pull requests to suggest improvements, report bugs, or add new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the [Discord.js](https://discord.js.org/) library for making it easy to interact with the Discord API.
- Inspired by the need for automated role assignment in Discord servers.

