export const BUILDER_VARIABLES = [
  { token: "{user}", label: "User mention", description: "Pings the user who ran the command" },
  { token: "{user_name}", label: "User name", description: "Username without discriminator" },
  { token: "{user_id}", label: "User ID", description: "Discord user ID" },
  { token: "{user_tag}", label: "User tag", description: "username#1234 when available" },
  { token: "{channel}", label: "Channel mention", description: "Mentions the current channel" },
  { token: "{channel_name}", label: "Channel name", description: "Name of the channel" },
  { token: "{channel_id}", label: "Channel ID", description: "Discord channel ID" },
  { token: "{server}", label: "Server name", description: "Guild name" },
  { token: "{server_id}", label: "Server ID", description: "Guild ID" },
  { token: "{server_icon}", label: "Server icon URL", description: "Guild icon URL" },
  { token: "{vars.your_var}", label: "Workflow variable", description: "Use vars.<name> to insert a variable" }
];
