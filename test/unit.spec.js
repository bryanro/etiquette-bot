/* jshint expr:true */
'use strict';

const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;
const logger = require('winston');
const sinon = require('sinon');

var messageHandler = require('../app/message-handler');
var slackWebClient = require('../app/slack-webclient');

var mockGetChannelInfo;
var mockGetUserInfo;
var mockSendMessage;
var mockPostMessage;
var mockPostEphemeral;

var channelInfo = require('./mocks/channel-info.json');
var userInfo = require('./mocks/user-info.json');

const originalEnv = {
    RESPONSE_TYPE_DM: process.env.RESPONSE_TYPE_DM,
    RESPONSE_TYPE_THREAD: process.env.RESPONSE_TYPE_THREAD,
    RESPONSE_TYPE_EPHEMERAL: process.env.RESPONSE_TYPE_EPHEMERAL,
    ENABLE_MENTION_INVITE: process.env.ENABLE_MENTION_INVITE
};

logger.level = 'debug';

var setEnv = (responseTypeDm, responseTypeThread, responseTypeEphemeral, enableMentionInvite) => {
    process.env.RESPONSE_TYPE_DM = responseTypeDm;
    process.env.RESPONSE_TYPE_THREAD = responseTypeThread;
    process.env.RESPONSE_TYPE_EPHEMERAL = responseTypeEphemeral;
    process.env.ENABLE_MENTION_INVITE = enableMentionInvite;
};
var setEnvDefault = () => {
    setEnv('FALSE', 'FALSE', 'TRUE', 'TRUE');
};

describe('unit tests', () => {
    before((done) => {
        done();
    });

    beforeEach((done) => {
        setEnvDefault();
        done();
    });

    describe('message-handler', () => {
        describe('positive-tests', () => {
            beforeEach((done) => {
                mockGetChannelInfo = sinon.stub(slackWebClient, 'getChannelInfo').callsFake((channelId, callback) => {
                    callback(null, channelInfo);
                });
                mockGetUserInfo = sinon.stub(slackWebClient, 'getUserInfo').callsFake((channelId, callback) => {
                    callback(null, userInfo);
                });
                mockSendMessage = sinon.stub(slackWebClient, 'sendMessage').callsFake((message, userInfo, channelInfo) => {
                    // simulate long-running event; should not casue timeout of tests
                    // note: this makes the test run finish after all tests are complete,
                    // but guarantees the calling method is not waiting for a callback or promise resolution
                    setTimeout(() => {
                        return;
                    }, 3000);
                });
                done();
            });

            var validateMessageSent = () => {
                return new Promise((resolve, reject) => {
                    expect(mockGetChannelInfo.callCount).to.equal(1, 'getChannelInfo should be called once');
                    expect(mockGetUserInfo.callCount).to.equal(1, 'getUserInfo should be called once');
                    expect(mockSendMessage.callCount).to.equal(1, 'sendMessage should be called once');
                    resolve();
                });
            };

            var throwMessageNotSentError = () => {
                throw new Error('message not sent');
            }

            it('should send a message when `@here` is at the start of text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `<!here> test`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@channel` is at the start of text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `<!channel> test`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@here` is at the end of text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `test <!here>`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@channel` is at the end of text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `test <!channel>`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@here` is in the middle of text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `test <!here> test`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@channel` is in the middle of text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `test <!channel> test`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@here` is in a multi-line message text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `test\n<!here>\nmultiline`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@here` is in a thread', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `<!here> message in thread`;
                msg.thread_ts = '1509195448.000118'; // thread is identified by thread timestamp
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when `@here` is in the text and there is an emoji', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `:smile: <!here> emoji`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            it('should send a message when the text contains nothing but a Display name', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `<@homer123>`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageSent);
            });

            afterEach((done) => {
                mockGetChannelInfo.restore();
                mockGetUserInfo.restore();
                mockSendMessage.restore();
                done();
            });
        });

        describe('negative-tests', () => {
            beforeEach((done) => {
                mockGetChannelInfo = sinon.stub(slackWebClient, 'getChannelInfo').callsFake((channelId, callback) => {
                    callback(null, channelInfo);
                });
                mockGetUserInfo = sinon.stub(slackWebClient, 'getUserInfo').callsFake((channelId, callback) => {
                    callback(null, userInfo);
                });
                mockSendMessage = sinon.stub(slackWebClient, 'sendMessage').callsFake((userInfo, channelInfo) => {
                    // simulate long-running event; should not casue timeout of tests
                    // note: this makes the test run finish after all tests are complete,
                    // but guarantees the calling method is not waiting for a callback or promise resolution
                    setTimeout(() => {
                        return;
                    }, 3000);
                });
                done();
            });

            var validateMessageNotSent = () => {
                return new Promise((resolve, reject) => {
                    expect(mockGetChannelInfo.callCount).to.equal(0, 'getChannelInfo should not be called');
                    expect(mockSendMessage.callCount).to.equal(0, 'sendMessage should not be called');
                    resolve();
                });
            };

            it('should not send a message when neither `@here` nor `@channel` are in the message text', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `test test test`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            it('should not send a message when the message is from a bot', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `<!here> test from bot`;
                msg.bot_id = `B1ABCD23E`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            it('should not send a message when the `@here` is in backticks', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `please stop writing \`@here\``;
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            it('should not send a message when the `@here` is in triple backticks', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = 'this\n```\n@here\n```\ntriple';
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            it('should not send a message when a reply without `@here` is made to a thread with the parent message having `@here`', () => {
                var msg = require('./mocks/incoming-message-thread.json');
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            it('should not send a message when the `@here` is in a direct message to the bot', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.channel = `D1ABCD23E`;
                msg.text = `<!here> test`; // note: I don't think sending the @here via DM is possible through the slack UI
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            it('should not send a message when the message contains text along with the display name', () => {
                var msg = require('./mocks/incoming-message.json');
                msg.text = `<@homer123> check this out`;
                return messageHandler.handleRtmMessage(msg).then(validateMessageNotSent)
            });

            afterEach((done) => {
                mockGetChannelInfo.restore();
                mockGetUserInfo.restore();
                mockSendMessage.restore();
                done();
            });
        });

        describe('error-handling', () => {

        });
    });

    describe('slackWebClient', () => {
        const channelId = `C2HLLGPT3`;
        const userId = `U0C6SS0N9`;
        const expectedHereMsg = `Hi <@john>. You just posted a \`@here\` or \`@channel\` message to #e-bot-test which has 3 members. Hopefully your message was a general announcement to the members of this channel, but if not both \`@here\` and \`@channel\` should primarily be used for *announcements*. If you are using these for trying to get help please consider looking at the channel *topic* to see if anyone is "on call," reading the *pinned items* to see if there's any documentation, or just *excluding these alert terms* if it's a general question that the community could answer.\nAlternatively, if you have an urgent issue causing business impact, please open an incident. The alert terms send notifications to people (a lot, in this case) and probably interrupt their current train of thought. Please be considerate when using these alerts in #e-bot-test and other channels.`;
        const expectedInviteMsg = `Hi <@john>. You just invited a user to a channel by posting their slack id directly to #e-bot-test which has 3 members. While this does prompt you to invite members to the channel, it also notifies the channel itself. Instead, you can use the \`\/invite\` command to directly invite members to a channel.\nAlternatively, if you click the member count at the top of the channel or in the channel info, there is a link for adding members to a channel. Inviting members by posting their name sends notifications to people (a lot, in this case) and probably interrupt their current train of thought. Please be considerate when inviting new members to #e-bot-test and other channels.`;
        const genericMsg = 'You just posted a `@here` or `@channel`';

        beforeEach((done) => {
            mockPostMessage = sinon.stub(slackWebClient, 'postMessage').callsFake((channel, text, opts, callback) => {
                expect(text).to.be.null;
                expect(callback).to.be.a('function');
                callback(null, true);
            });
            mockPostEphemeral = sinon.stub(slackWebClient, 'postEphemeral').callsFake((channel, text, user, opts, optCb) => {
                expect(channel).to.equal(channelId, 'postEphemeral channel set to the channel id');
                expect(user).to.equal(userId, 'postEphemeral user set to the user id');
                expect(optCb).to.be.a('function');
                optCb(null, true);
            });
            mockGetChannelInfo = sinon.stub(slackWebClient, 'getChannelInfo').callsFake((channelId, callback) => {
                callback(null, channelInfo);
            });
            mockGetUserInfo = sinon.stub(slackWebClient, 'getUserInfo').callsFake((channelId, callback) => {
                callback(null, userInfo);
            });
            done();
        });

        it('should call postMessage with the correct parameters when sending a DM for here messages', () => {
            setEnv('TRUE', 'FALSE', 'FALSE', 'FALSE');
            var msg = require('./mocks/incoming-message.json');
            msg.text = '<!here>';
            msg.user = userId;
            msg.channel = channelId;
            msg.bot_id = null;
            return new Promise((resolve, reject) => {
                messageHandler.handleRtmMessage(msg).then(() => {
                    expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called');
                    sinon.assert.calledWithExactly(mockPostMessage, userId, null, {
                        as_user: true,
                        link_names: true,
                        text: expectedHereMsg
                    }, sinon.match.func);
                    expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            });
        });

        it('should call postMessage with the correct parameters when sending a thread for here messages', () => {
            setEnv('FALSE', 'TRUE', 'FALSE', 'FALSE');
            var msg = require('./mocks/incoming-message.json');
            msg.text = '<!here>';
            msg.user = userId;
            msg.channel = channelId;
            return new Promise((resolve, reject) => {
                messageHandler.handleRtmMessage(msg).then(() => {
                    expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called');
                    sinon.assert.calledWithExactly(mockPostMessage, channelId, null, {
                        as_user: true,
                        link_names: true,
                        text: expectedHereMsg,
                        thread_ts: `1509195448.000118`
                    }, sinon.match.func);
                    expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            });
        });

        it('should call postMessage with the correct parameters when sending an ephemeral message for here messages', () => {
            setEnv('FALSE', 'FALSE', 'TRUE', 'FALSE');
            var msg = require('./mocks/incoming-message.json');
            msg.text = '<!here>';
            msg.user = userId;
            msg.channel = channelId;
            return new Promise((resolve, reject) => {
                messageHandler.handleRtmMessage(msg).then(() => {
                    expect(mockPostMessage.callCount).to.equal(0, 'postMessage should not be called');
                    expect(mockPostEphemeral.callCount).to.equal(1, 'postEphemeral should be called');
                    sinon.assert.calledWithExactly(mockPostEphemeral, channelId, expectedHereMsg, userId, {
                        as_user: true,
                        channel: channelId,
                        link_names: true,
                        text: expectedHereMsg
                    }, sinon.match.func);
                    resolve();
                }).catch((err) => {
                    reject(err);
                });
            });
        });

        describe('RESPONSE_TYPE_* combinations for @here and @channel', () => {
            it('should not send message or ephemeral when all responses types are set to false', () => {
                setEnv('FALSE', 'FALSE', 'FALSE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(0, 'postMessage should not be called');
                expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
            });

            it('should send an ephemeral message but not a DM or thread', () => {
                setEnv('FALSE', 'FALSE', 'TRUE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(0, 'postMessage should not be called');
                expect(mockPostEphemeral.callCount).to.equal(1, 'postEphemeral should be called once');
            });

            it('should send a thread message but not a DM or ephemeral', () => {
                setEnv('FALSE', 'TRUE', 'FALSE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called once');
                expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                expect(mockPostMessage.getCall(0).args[0]).to.equal(channelId);
            });

            it('should send a thread message and ephemeral message but not a DM', () => {
                setEnv('FALSE', 'TRUE', 'TRUE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called once');
                expect(mockPostEphemeral.callCount).to.equal(1, 'postEphemeral should be called once');
                expect(mockPostMessage.getCall(0).args[0]).to.equal(channelId);
            });

            it('should send a DM but not a thread or ephemeral message', () => {
                setEnv('TRUE', 'FALSE', 'FALSE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called once');
                expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                expect(mockPostMessage.getCall(0).args[0]).to.equal(userId);
            });

            it('should send a DM and ephemeral message but not a thread', () => {
                setEnv('TRUE', 'FALSE', 'TRUE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called once');
                expect(mockPostEphemeral.callCount).to.equal(1, 'postEphemeral should be called once');
                expect(mockPostMessage.getCall(0).args[0]).to.equal(userId);
            });

            it('should send a DM and thread but not an ephemeral message', () => {
                setEnv('TRUE', 'TRUE', 'FALSE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(2, 'postMessage should be called twice');
                expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                expect(mockPostMessage.getCall(0).args[0]).to.equal(userId);
                expect(mockPostMessage.getCall(1).args[0]).to.equal(channelId);
            });

            it('should send a DM, thread, and an ephemeral message', () => {
                setEnv('TRUE', 'TRUE', 'TRUE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                slackWebClient.sendMessage(msg, genericMsg, userInfo, channelInfo);
                expect(mockPostMessage.callCount).to.equal(2, 'postMessage should be called twice');
                expect(mockPostEphemeral.callCount).to.equal(1, 'postEphemeral should be called once');
                expect(mockPostMessage.getCall(0).args[0]).to.equal(userId);
                expect(mockPostMessage.getCall(1).args[0]).to.equal(channelId);
            });
        });

        describe('@ invites', () => {
            it('should not call postMessage when sending a DM for invite messages if flag is disabled', () => {
                setEnv('TRUE', 'FALSE', 'FALSE', 'FALSE');
                var msg = require('./mocks/incoming-message.json');
                msg.text = '<@homer123>';
                msg.user = userId;
                msg.channel = channelId;
                return new Promise((resolve, reject) => {
                    messageHandler.handleRtmMessage(msg).then(() => {
                        expect(mockPostMessage.callCount).to.equal(0, 'postMessage should not be called');
                        expect(mockPostMessage.callCount).to.equal(0, 'mockPostMessage should not be called');
                        expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                });
            });

            describe('RESPONSE_TYPE_* combinations for @ invites', () => {
                it('should call postMessage with the correct parameters when sending a DM for invite messages', () => {
                    setEnv('TRUE', 'FALSE', 'FALSE', 'TRUE');
                    var msg = require('./mocks/incoming-message.json');
                    msg.text = '<@homer123>';
                    msg.user = userId;
                    msg.channel = channelId;
                    return new Promise((resolve, reject) => {
                        messageHandler.handleRtmMessage(msg).then(() => {
                            expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called');
                            sinon.assert.calledWithExactly(mockPostMessage, userId, null, {
                                as_user: true,
                                link_names: true,
                                text: expectedInviteMsg
                            }, sinon.match.func);
                            expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                });

                it('should call postMessage with the correct parameters when sending a thread for invite messages', () => {
                    setEnv('FALSE', 'TRUE', 'FALSE', 'TRUE');
                    var msg = require('./mocks/incoming-message.json');
                    msg.text = '<@homer123>';
                    msg.user = userId;
                    msg.channel = channelId;
                    return new Promise((resolve, reject) => {
                        messageHandler.handleRtmMessage(msg).then(() => {
                            expect(mockPostMessage.callCount).to.equal(1, 'postMessage should be called');
                            sinon.assert.calledWithExactly(mockPostMessage, channelId, null, {
                                as_user: true,
                                link_names: true,
                                text: expectedInviteMsg,
                                thread_ts: `1509195448.000118`
                            }, sinon.match.func);
                            expect(mockPostEphemeral.callCount).to.equal(0, 'postEphemeral should not be called');
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                });

                it('should call postMessage with the correct parameters when sending an ephemeral message for invite messages', () => {
                    setEnv('FALSE', 'FALSE', 'TRUE', 'TRUE');
                    var msg = require('./mocks/incoming-message.json');
                    msg.text = '<@homer123>';
                    msg.user = userId;
                    msg.channel = channelId;
                    return new Promise((resolve, reject) => {
                        messageHandler.handleRtmMessage(msg).then(() => {
                            expect(mockPostMessage.callCount).to.equal(0, 'postMessage should not be called');
                            expect(mockPostEphemeral.callCount).to.equal(1, 'postEphemeral should be called');
                            sinon.assert.calledWithExactly(mockPostEphemeral, channelId, expectedInviteMsg, userId, {
                                as_user: true,
                                channel: channelId,
                                link_names: true,
                                text: expectedInviteMsg
                            }, sinon.match.func);
                            resolve();
                        }).catch((err) => {
                            reject(err);
                        });
                    });
                });
            });
        });

        afterEach((done) => {
            logger.debug("\nRESETTING PARAMETERS AND MOCKS\n")
            mockPostMessage.restore();
            mockPostEphemeral.restore();
            mockGetChannelInfo.restore();
            mockGetUserInfo.restore();
            done();
        });
    });

    after((done) => {
        // restore environment variables
        process.env.RESPONSE_TYPE_DM = originalEnv.RESPONSE_TYPE_DM;
        process.env.RESPONSE_TYPE_THREAD = originalEnv.RESPONSE_TYPE_THREAD;
        process.env.RESPONSE_TYPE_EPHEMERAL = originalEnv.RESPONSE_TYPE_EPHEMERAL;
        process.env.ENABLE_MENTION_INVITE = originalEnv.ENABLE_MENTION_INVITE;
        done();
    });
});
