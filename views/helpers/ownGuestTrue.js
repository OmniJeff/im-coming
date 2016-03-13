var _ = require('lodash');

module.exports = function (options, context) {
    if (_.isEmpty(context)) {
        return context.inverse(this);
    }

    console.log('options = ' + require('util').inspect(options));
    console.log('context = ' + require('util').inspect(context));

    return options;
};