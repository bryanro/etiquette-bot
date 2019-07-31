'use strict';

// abstraction layer, mainly to be used for unit testing so these functions can be mocked

const logger = require('./logger');
const { WebClient } = require('@slack/web-api');

var web = new WebClient(process.env.SLACK_TOKEN);

var SlackWebClient = {
    getChannelInfo: (channelId, callback) => {
        web.channels.info({channel: channelId})
        .then(resp => callback(null, resp))
        .catch(err => callback(err, null));
    },
    getUserInfo: (userId, callback) => {
        web.users.info({user: userId})
        .then(resp => callback(null, resp))
        .catch(err => callback(err, null));
    },
    postMessage: (channel, text, opts, callback) => {
        web.chat.postMessage({channel, text, ...opts})
        .then(resp => callback(null, resp))
        .catch(err => callback(err, null));
    },
    postEphemeral: (channel, text, user, opts, optCb) => {
        web.chat.postEphemeral({channel, text, user, ...opts})
        .then(resp => optCb(null, resp))
        .catch(err => callback(err, null));
    },
    postReaction: (name, opts, callback) => {
        web.reactions.add({name, ...opts})
        .then(resp => callback(null, resp))
        .catch(err => callback(err, null));
    },
    sendMessage: (receivedMessage, responseMessageText, userInfo, channelInfo) => {
        logger.debug(`user info: ${JSON.stringify(userInfo)}`);

        logger.info(`sending message to USER="${userInfo.user.name}" for CHANNEL="${channelInfo.channel.name}"`);

        let channelUserCount = `a lot of`;
        if (!channelInfo.channel.members) {
            channelUserCount = channelInfo.channel.members.length;
        }

        if (process.env.RESPONSE_TYPE_DM === 'TRUE') {
            // send a direct message to the user
            SlackWebClient.postMessage(receivedMessage.user, null, {
                as_user: true,
                link_names: true,
                text: responseMessageText
            }, (err, messageResponse) => {
                if (err) {
                    logger.error(`posting direct message: ${err}`);
                }
                else {
                    logger.debug(`direct message sent successfully: ${JSON.stringify(messageResponse)}`);
                }
            });
        }

        if (process.env.RESPONSE_TYPE_THREAD === 'TRUE') {
            // send a thread reply
            SlackWebClient.postMessage(channelInfo.channel.id, null, {
                as_user: true,
                link_names: true,
                text: responseMessageText,
                thread_ts: receivedMessage.ts
            }, (err, messageResponse) => {
                if (err) {
                    logger.error(`posting response in thread: ${err}`);
                }
                else {
                    logger.debug(`response in thread sent successfully: ${JSON.stringify(messageResponse)}`);
                }
            });
        }

        if (process.env.RESPONSE_TYPE_EPHEMERAL === 'TRUE') {
            // send an ephemeral message only the user who sent the message can see
            SlackWebClient.postEphemeral(channelInfo.channel.id, responseMessageText, userInfo.user.id, {
                as_user: true,
                channel: channelInfo.channel.id,
                link_names: true,
                text: responseMessageText
            }, (err, messageResponse) => {
                if (err) {
                    logger.error(`posting ephemeral message: ${err}`);
                }
                else {
                    logger.debug(`ephemeral message sent successfully:\n${JSON.stringify(messageResponse)}`);
                }
            });
        }

        if (process.env.RESPONSE_TYPE_REACTION_EMOJI) {
            // send an emoji reaction to the message
            SlackWebClient.postReaction(process.env.RESPONSE_TYPE_REACTION_EMOJI, {
                channel: channelInfo.channel.id,
                timestamp: receivedMessage.ts
            }, (err, messageResponse) => {
                if (err) {
                    logger.error(`posting reaction emoji: ${err}`);
                }
                else {
                    logger.debug(`reaction emoji sent successfully:\n${JSON.stringify(messageResponse)}`);
                }
            });
        }
    }
};

module.exports = SlackWebClient;
