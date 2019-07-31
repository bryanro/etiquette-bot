# Etiquette Bot

This slack bot will listen for `@here` and `@channel` messages, then politely direct message the user to explain those are primarily to be used for announcements.

## Table of Contents

* [Features](#features)
* [Running Code](#running-code)
* [Development](#development)

## Features

Add etiquette-bot to a channel by inviting it:

```
/invite @etiquette-bot
```

Once the bot is in the channel, anyone that does an `@here` or `@channel` will get a *friendly* message response from the bot.

### Types of Responses

There are 3 responses the etiquette bot can use:

* DM: direct message the user
* Thread: reply as a threaded message to the user (all users in the channel will be able to see the thread)
* Ephemeral: respond to the user in the channel, but only the user can see it (shows up as grey text)

These can be configured using [environment variables](#environment-variables)

## Running Code

### Dependencies

Download and install [nodejs](https://nodejs.org/en/).

### Environment Variables

| Environment Variable Name | Description | Required | Valid Values | Default |
| --- | --- | --- | --- | --- |
| `ENABLE_MENTION_INVITE` | react to messages where text only mentions a single user without any other text with intentions to invite the person to the channel<br />Example: `@bryanr` | | <ul><li>`TRUE`</li><li>`FALSE`</li></ul> | `FALSE` |
| `LOG_LEVEL` | logging verbosity |  | <ul><li>`debug`</li><li>`info`</li><li>`warn`</li><li>`error`</li></ul> | `info`
| `MIN_USERS_IN_CHANNEL` | the minimum number of users in a channel needed to trigger the direct message<br /><ul><li>Example: if there are 10 users in a channel but the `MIN_USERS_IN_CHANNEL` is set to 50, then the `@here` and `@channel` messages will be ignored</li></ul> | | | 0 |
| `RESPONSE_TYPE_DM` | whether to respond to the user with a direct message | | <ul><li>`TRUE`</li><li>`FALSE`</li></ul> | `FALSE` |
| `RESPONSE_TYPE_THREAD` | whether to respond to the user in a thread | | <ul><li>`TRUE`</li><li>`FALSE`</li></ul> | `FALSE` |
| `RESPONSE_TYPE_EPHEMERAL` | whether to respond to the user with an ephemeral message in the channel that only that user can see | | <ul><li>`TRUE`</li><li>`FALSE`</li></ul> | `FALSE` |
| `RESPONSE_TYPE_REACTION_EMOJI` | emoji to respond to the user with (will not have a reaction if not set) | | <ul><li>[not set]</li><li>smile</li><li>laughing</li><li>...</li></ul> | Not set |
| `SLACK_TOKEN` | the slack API token for the bot | **Required** | usually starts with `xoxb-...` | | |

### Start the App Locally

```
npm install
npm start
```

### Running the Tests Locally

```
npm install
npm test
```

### Code Coverage

```
npm install
npm test
open ./coverage/lcov-report/index.html
```

## Development

### Slack Documentation

* [Node SDK Docs](https://slack.dev/node-slack-sdk/)
* [Node SDK Github Repo](https://github.com/slackapi/node-slack-sdk)
* [RTM Client](https://slack.dev/node-slack-sdk/rtm-api)
* [Web Client postMessage](https://github.com/slackapi/node-slack-sdk/blob/master/integration-tests/types/webclient-named-method-types.ts)
