'use strict';

const logger = require('./logger');
const slackWebClient = require('./slack-webclient');

const MIN_USERS_IN_CHANNEL = process.env.MIN_USERS_IN_CHANNEL || 0; // minimum number of users in a channel needed to send DM

var MessageHandler = {};

MessageHandler.getWebClient = () => {
    return webClient;
}

MessageHandler.handleRtmMessage = (message) => {
    return new Promise((resolve, reject) => {
        logger.debug(`received message: ${JSON.stringify(message)}`);

        if (message.bot_id) {
            logger.debug(`message is from bot, so ignore`);
            resolve();
        }
        else if (message.channel[0] !== 'C') {
            logger.debug(`message is not in a public channel (e.g. DM), so ignore`);
            resolve();
        }
        else if (!message.text) {
            logger.debug(`message.text does not exist`);
            resolve();
        }
        else if ((process.env.ENABLE_MENTION_INVITE === 'TRUE') && message.text.match(/^<@[a-zA-Z0-9_]+>$/)) {
            var userId = message.user;
            var channelId = message.channel;

            slackWebClient.getChannelInfo(channelId, (err, channelInfo) => {
                if (err) {
                    logger.error(`getting channel info: ${err}`);
                    reject(err);
                }
                else if (channelInfo.channel.members && channelInfo.channel.members.length < MIN_USERS_IN_CHANNEL) {
                    logger.debug(`channel only has ${channelInfo.channel.members.length} members and does not meet minimum users qualification (${MIN_USERS_IN_CHANNEL}, so ignore`);
                    resolve();
                }
                else {
                    logger.debug(`channel info: ${JSON.stringify(channelInfo)}`);

                    slackWebClient.getUserInfo(userId, (err, userInfo) => {
                        if (err) {
                            logger.error(`getting user "${userId}": ${err}`);
                            reject(err);
                        }
                        else {
                            var responseMessageText = `Hi <@${userInfo.user.name}>. You just invited a user to a channel by posting their slack id directly to #${channelInfo.channel.name} which has ${channelInfo.channel.members.length} members. While this does prompt you to invite members to the channel, it also notifies the channel itself. Instead, you can use the \`\/invite\` command to directly invite members to a channel.\nAlternatively, if you click the member count at the top of the channel or in the channel info, there is a link for adding members to a channel. Inviting members by posting their name sends notifications to people (a lot, in this case) and probably interrupt their current train of thought. Please be considerate when inviting new members to #${channelInfo.channel.name} and other channels.`;
                            slackWebClient.sendMessage(message, responseMessageText, userInfo, channelInfo);
                            resolve();
                        }
                    });
                }
            });
        }
        else if (message.text.indexOf('<!here>') != -1 || message.text.indexOf('<!channel>') != -1)  {
            var userId = message.user;
            var channelId = message.channel;

            slackWebClient.getChannelInfo(channelId, (err, channelInfo) => {
                if (err) {
                    logger.error(`getting channel info: ${err}`);
                    reject(err);
                }
                else if (channelInfo.channel.members && channelInfo.channel.members.length < MIN_USERS_IN_CHANNEL) {
                    logger.debug(`channel only has ${channelInfo.channel.members.length} members and does not meet minimum users qualification (${MIN_USERS_IN_CHANNEL}, so ignore`);
                    resolve();
                }
                else {
                    logger.debug(`channel info: ${JSON.stringify(channelInfo)}`);

                    slackWebClient.getUserInfo(userId, (err, userInfo) => {
                        logger.debug(`user info: ${JSON.stringify(userInfo)}`)
                        if (err) {
                            logger.error(`getting user "${userId}": ${err}`);
                            reject(err);
                        }
                        else {
                            var responseMessageText = `Hi <@${userInfo.user.name}>. You just posted a \`@here\` or \`@channel\` message to #${channelInfo.channel.name} which has ${channelInfo.channel.members.length} members. Hopefully your message was a general announcement to the members of this channel, but if not both \`@here\` and \`@channel\` should primarily be used for *announcements*. If you are using these for trying to get help please consider looking at the channel *topic* to see if anyone is "on call," reading the *pinned items* to see if there's any documentation, or just *excluding these alert terms* if it's a general question that the community could answer.\nThe alert terms send notifications to people (a lot, in this case) and probably interrupt their current train of thought. Please be considerate when using these alerts in #${channelInfo.channel.name} and other channels.`;
                            slackWebClient.sendMessage(message, responseMessageText, userInfo, channelInfo);
                            resolve();
                        }
                    });
                }
            });
        }
        else {
            logger.debug(`message does not contain @here, @channel, or standalone user mention, so ignore`);
            resolve();
        }
    });
};

module.exports = MessageHandler;
