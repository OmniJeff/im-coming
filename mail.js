var sendgrid  = require('sendgrid')('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  ');

module.exports = function (subject, body, cb) {
    sendgrid.send({
        to: 'us@jillandjeffwhite.nyc',
        from: 'jeff@jillandjeffwhite.nyc',
        subject: subject,
        html: body
    }, cb);
};