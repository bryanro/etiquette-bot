'use strict';

const logger = require('./logger');
const {RTMClient} = require('@slack/rtm-api');

const messageHandler = require('./message-handler');

// to enable debug logging for the rtm client, use this line instead of the one following
//var rtm = new RTMClient(process.env.SLACK_TOKEN, { logLevel: logger.level });
var rtm = new RTMClient(process.env.SLACK_TOKEN);

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on('authenticated', (rtmStartData) => {
    logger.info(`authenticated as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

rtm.on('channel_joined', (msg) => {
    logger.info(`channel joined: ${JSON.stringify(msg, null, 2)}`);
});

rtm.on('channel_left', (msg) => {
    logger.info(`channel left: ${JSON.stringify(msg, null, 2)}`);
});

rtm.on('message', (message) => {
    messageHandler.handleRtmMessage(message)
        .then(() => {
            logger.silly(`handleRtmMessage promise resolved: message handled`);
        })
        .catch(() => {
            logger.silly(`handleRtmMessage promise rejected: message not handled`);
        });
});

(async () => {
    // Connect to slack
    const { self, team } = await rtm.start();
})();
