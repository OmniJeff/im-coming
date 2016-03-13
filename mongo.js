const Mongo = require('mongodb').MongoClient;
var Assert = require('assert');

const internals = {
    db: null,
    guestsCollection: null,
    adminsCollection: null
};

Mongo.connect('mongodb://localhost:27017/flynn', (err, db) => {

    Assert.equal(null, err);
    console.log("Connected to Mongo");
    internals.db = db;
    internals.guestsCollection = internals.db.collection('guests');
    internals.adminsCollection = internals.db.collection('admins');

    module.exports.getAllGuests(function (guests) {

        console.log('Guests:\n' + require('util').inspect(guests));
    });
});

module.exports = {
    addNewGuest: (guest, callback) => {

        // TODO: Assert firstName and lastName exist
        if (!guest.id) {
            guest.id = GuestId(guest.firstName, guest.lastName);
        }

        // Remove this guest first
        var guestsToRemove = {
            $or: [
                { id: { $eq: guest.id } },
                { $and: [
                    { namedGuestFirst: { $eq: guest.firstName } },
                    { namedGuestLast: { $eq: guest.lastName } }
                ] }
            ]
        };

        internals.guestsCollection.remove(guestsToRemove, function (err, result) {

            // Insert guest
            internals.guestsCollection.insert(guest, function (err, result) {
                Assert.equal(err, null);
                Assert.equal(1, result.result.n);
                Assert.equal(1, result.ops.length);
                console.log('Inserted ' + guest.id + ' into Mongo');

                if (guest.namedGuestFirst && guest.namedGuestLast) {

                    var newGuest = {
                        firstName: guest.namedGuestFirst,
                        lastName: guest.namedGuestLast,
                        namedGuestInvited: 'yes',
                        namedGuestFirst: guest.firstName,
                        namedGuestLast: guest.lastName,
                        eventId: guest.eventId,
                        ownGuestInvited: 'no',
                        id: GuestId(guest.namedGuestFirst, guest.namedGuestLast)
                    };

                    console.log('newGuest is ' + require('util').inspect(newGuest));

                    // Insert named guest
                    internals.guestsCollection.insert(newGuest, function (err, result) {
                        Assert.equal(err, null);
                        Assert.equal(1, result.result.n);
                        Assert.equal(1, result.ops.length);
                        console.log('Inserted ' + newGuest.id + ' into Mongo');
                        callback(result, { guestId: guest.id, namedGuestId: newGuest.id });
                    })
                }
                else {
                    callback(result, { guestId: guest.id });
                }
            });
        });
    },

    updateGuest: (id, guestUpdate, callback) => {

        internals.guestsCollection.updateOne({ id: id }, guestUpdate, function (err, result) {
            Assert.equal(err, null);
            Assert.equal(1, result.result.n);
            console.log('Updated ' + id + ' to ' + JSON.stringify(guestUpdate));
            callback(result);
        });
    },

    deleteGuest: (guest, callback) => {

        // Insert some documents
        internals.guestsCollection.deleteOne({ id: guest.id }, function (err, result) {
            Assert.equal(err, null);
            Assert.equal(1, result.result.n);
            console.log('Removed ' + guest.id + ' from Mongo.');
            callback(result);
        });
    },

    getGuest: (guestData, callback) => {

        var firstName = guestData.firstName;
        var lastName = guestData.lastName;
        var eventId = guestData.eventId;
        var guestId = GuestId(firstName, lastName);

        var query = {
            id: guestId,
            eventId: eventId
        };

        //noinspection JSDeprecatedSymbols
        internals.guestsCollection.findOne(query, function (err, doc) {

            Assert.equal(err, null);

            console.log('trying to find ' + JSON.stringify(query));
            console.log('found: ' + require('util').inspect(doc));
            console.dir(doc);
            callback(doc);
        });
    },

    getAllGuests: (callback) => {

        // Find some documents
        internals.guestsCollection.find({}).toArray(function (err, docs) {
            Assert.equal(err, null);
            console.log("Found the following records");
            console.dir(docs);
            callback(docs);
        });
    }
};



function GuestId(firstName, lastName) {
    firstName = firstName.trim().charAt(0).toUpperCase() + firstName.slice(1);
    lastName = lastName.trim().charAt(0).toUpperCase() + lastName.slice(1);
    return firstName + lastName;
}