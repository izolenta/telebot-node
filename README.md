### Setting up
1. Set up your own MySQL instance somewhere
2. Import MySQL schema from mysql_dump.sql (default database name is "telebot")
3. Rename .env.example to .env and provide it with your API keys and MySQL data
4. Install docker if you didn't yet
5. Run docker-build.sh
6. Run docker-run.sh
7. You're good to go!

### Commands

**/whoami** - displays information about your role (user/admin, currently does not affect anything) as well as about current mode (simple or context) and your AI assistant personality

**/context** - switches to context mode where ChatGPT is aware of previous chat context, and you can ask come corrective questions. Issuing this command creates a new context, also new context is created if you didn't send any messages within two hours. NOTE: in context mode all current context/chat history is being sent to OpenAI every time you send a message, so, since you pay for tokens, which are connected to words, you can spend a lot of $$ very quickly!

**/simple** - switches to simple mode, where ChatGPT is not aware of previous context/messages. Useful if you need to perform some one-time task. Takes much less $$.

**/setassistant** - sets your assistant personality. I.e. `/setassistant an assistant who is speaking like Master Yoda`

**/resetassistant** - clears your assistant personality and sets it to `a friendly personal assistant`