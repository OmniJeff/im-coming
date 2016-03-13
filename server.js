'use strict';

const Hapi = require('hapi');
const Mongo = require('./mongo');
const Path = require('path');
const Hoek = require('hoek');

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({
    host: 'localhost',
    port: 8777
});

server.register(require('inert'), (err) => {
    if (err) {
        throw err;
    }
});

server.register(require('vision'), (err) => {

    Hoek.assert(!err, err);

    server.views({
        engines: {
            html: require('handlebars')
        },
        relativeTo: __dirname,
        path: 'views',
        layoutPath: 'views/layout',
        helpersPath: 'views/helpers'
    });
});

server.route({
    method: 'GET',
    path: '/{eventId}/rsvp',
    handler: function (request, reply) {

        // Solicit user first and last name
        return reply.view('userLoginForm');
    }
});

function processRsvp(request, reply) {

    console.log('processRsvp');
    console.log('request.payload = ' + require('util').inspect(request.payload));
    console.log('request.payload.lastName = ' + request.payload.lastName);

    var guestUpdate = {
        $set: {
            coming: request.payload.coming,
            namedGuestComing: request.payload.namedGuestComing,
            ownGuestComing: request.payload.ownGuestComing,
            ownGuestFirstName: request.payload.ownGuestFirstName,
            ownGuestLastName: request.payload.ownGuestLastName
        }
    };

    Mongo.updateGuest(request.payload.guestId, guestUpdate, (res) => {

        console.log('Guest updated for rsvp: ' + request.payload.guestId);
        console.log('ownGuestComing = ' + request.payload.ownGuestComing);

        if (request.payload.namedGuestComing === 'yes') {

            var namedGuest = {
                id: request.payload.namedGuestId,
                coming: request.payload.namedGuestComing,
                namedGuestComing: request.payload.coming
            };

            Mongo.addNewGuest(namedGuest, (res) => {
                console.log('Named guest added: ' + require('util').inspect(res));

                return reply('we got your rsvp!!<br /><br />' + 'request.payload = ' + require('util').inspect(request.payload));
            });
        }
        else {
            return reply('we got your rsvp!!<br /><br />' + 'request.payload = ' + require('util').inspect(request.payload));
        }
    });
}

function processLogin(request, reply) {

    console.log('process login');

    const firstName = capitalizeFirstLetter(request.payload.firstName);
    const lastName = capitalizeFirstLetter(request.payload.lastName);
    const eventId = request.params.eventId;

    const guestData = {
        firstName: firstName,
        lastName: lastName,
        eventId: eventId
    };

    Mongo.getGuest(guestData, (guest) => {

        if (!guest) {
            return reply.view('userLoginForm', { err: 'That name wasn\'t found in the guest list.' });
        }

        console.log('namedGuestFirst = ' + guest.namedGuestFirst);
        console.log('namedGuestLast = ' + guest.namedGuestLast);

        var hasNamedGuest = guest.namedGuestFirst && guest.namedGuestLast && (guest.namedGuestFirst !== '') && (guest.namedGuestLast !== '') ? true : false;
        console.log('hasNamedGuest = ' + hasNamedGuest);
        var namedGuestFirst = capitalizeFirstLetter(guest.namedGuestFirst);
        var namedGuestLast = capitalizeFirstLetter(guest.namedGuestLast);

        var namedGuestData = {
            firstName: namedGuestFirst,
            lastName: namedGuestLast,
            eventId: eventId
        };

        var data = {
            id: guest.id,
            firstName: firstName,
            lastName: lastName,
            namedGuestFirst: namedGuestFirst,
            namedGuestLast: namedGuestLast,
            eventId: eventId,
            hasNamedGuest: hasNamedGuest ? "block" : "none",
            hasOwnGuest: (guest.ownGuest === 'yes') ? "block" : "none"
        };

        if (hasNamedGuest) {
            Mongo.getGuest(namedGuestData, (namedGuest) => {

                if (!namedGuest) {
                    return reply.view('userLoginForm', { err: 'Something went wrong getting your named guest. :(' });
                }

                data.namedGuestId = namedGuest.id;
                return reply.view('userRsvpForm', data);
            })
        }
        else {
            return reply.view('userRsvpForm', data);
        }
    });
}

server.route({
    method: 'POST',
    path: '/{eventId}/rsvp',
    handler: function (request, reply) {

        if (request.payload.rsvpForm) {
            return processRsvp(request, reply);
        }
        else if (request.payload.loginForm) {
            return processLogin(request, reply);
        }
        else {
            return reply('Uh oh, there was a problem. :(');
        }
    }
});

server.route({
    method: 'GET',
    path: '/{eventId}/guest/{guestId}',
    handler: function (request, reply) {

        // Return guest

        const query = {
            id: request.params.guestId,
            eventId: request.params.eventId
        };

        Mongo.getGuest(query, (guest) => {

            return reply(JSON.stringify(guest));
        });
    }
});

server.route({
    method: 'PUT',
    path:'/{eventId}/guest/{guestId}',
    handler: function (request, reply) {

        // Update guest

        return reply(request.params.id);
    }
});

server.route({
    method: 'POST',
    path:'/{eventId}/guest/{guestId}',
    handler: function (request, reply) {

        // Add new guest

        return reply(request.params.id);
    }
});

server.route({
    method: 'GET',
    path:'/{eventId}/admin',
    handler: function (request, reply) {

        // Display page showing all guests with options to
        // add, remove, update
        console.log('get admin');

        reply.view('addUserForm');
    }
});

server.route({
    method: 'POST',
    path:'/{eventId}/admin',
    handler: function (request, reply) {

        console.log('post admin');

        // Create new guest
        var guest = request.payload;
        guest.eventId = request.params.eventId;
        guest.firstName = capitalizeFirstLetter(guest.firstName);
        guest.lastName = capitalizeFirstLetter(guest.lastName);

        if (guest.namedGuestInvited === 'yes' && (request.payload.namedGuestFirst === '' || request.payload.namedGuestLast === '')) {
            reply.view('addUserForm', { err:'When adding Named Guest, please supply his or her first and last name.' });
        }
        else {

            if (guest.namedGuestInvited) {
                guest.namedGuestFirst = capitalizeFirstLetter(guest.namedGuestFirst);
                guest.namedGuestLast = capitalizeFirstLetter(guest.namedGuestLast);
            }

            Mongo.addNewGuest(guest, (res, added) => {

                Mongo.getAllGuests((res) => {
                    reply('added: ' + JSON.stringify(added) + '<br /><br />' + JSON.stringify(res));
                });
            });
        }
    }
});

function capitalizeFirstLetter(str) {
    if (str === '' || str === null) return '';
    var ret = str ? str.trim().charAt(0).toUpperCase() + str.slice(1) : str;
    console.log('capitalizeFirstLetter: ' + str + ' -> ' + ret);
    return ret;
}

// Start the server
server.start((err) => {

    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});
