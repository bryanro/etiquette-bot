'use strict';

const express = require('express');

const logger = require('./app/logger');

const app = express();

logger.level = process.env.LOG_LEVEL || 'info';

require('./app/slack-listener');

if (process.env.PORT) {
    app.listen(process.env.PORT, () => {
        logger.info(`server started on port ${process.env.PORT} to pass PCF healthcheck`);
    });
}
else {
    logger.info('PORT env variable not set, so not starting web server');
}
