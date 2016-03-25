var sendgrid = null;

module.exports = function (subject, body, key, cb) {
    
    if (!sendgrid) {
        sendgrid = require('sendgrid')(key);
    }
    
    sendgrid.send({
        to: 'us@jillandjeffwhite.nyc',
        from: 'jeff@jillandjeffwhite.nyc',
        subject: subject,
        html: body
    }, cb);
};