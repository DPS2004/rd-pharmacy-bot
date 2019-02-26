// The database is located on a remote island in the Bahamas, this will not go wrong
// firestore is really annoying to work with directly, so we exclusively use these wrapper functions.
const fyre = require('./firestore_singleton.js');
const timestamps = require('../utils/timestamps.js');

const COLLECTION_NAME = "dailyblend";

let E = module.exports = {};

// Get an user, where we already assume they exist. Returns false if they don't exist.
// Returns a DocumentSnapshot
E.getExistingUser = (userID) => {
    let collection = fyre.collection(COLLECTION_NAME);
    let query = collection.where("id", "==", userID);
    return query.get()
    .then( (data) => {
        if (data.docs.length > 0) {
            return data.docs[0];
        } else {
            return false;
        }
    })
}

// creates a new user. Returns a DocumentSnapshot
E.createNewUser = (userID) => {
    let collection = fyre.collection(COLLECTION_NAME);
    return collection.add({
        id: userID,
        lastDrinkTimestamp: 1,
        count: 0,
    })
    .then( (docRef) => {
        return docRef.get()
    })
    .then( (doc) => {
        return doc;
    })
}

// gets a user. makes their data if it doesn't exist yet.
// usually, you'll use this one. Returns a DocumentSnapshot
E.getUser = (userID) => {
    return E.getExistingUser(userID)
    .then ( (doc) => {
        if (doc) {
            return doc;
        } else {
            return E.createNewUser(userID);
        }
    })
}

// Updates a user with new data.
E.updateUser = (userID, newData) => {
    let user = E.getUser(userID);
    return user
    .then( (snapshot) => {
        return snapshot.ref.update(newData);
    })
}

E.lastBlendTime = () =>  {
    return E.getExistingUser("METADATA")
    .then ( (snapshot) => {
        return snapshot.data().blendTimestamp;
    })
}

E.setBlendTime = (newTime) => {
    return E.updateUser("METADATA", {blendTimestamp: newTime});
}

E.drink = async (userID, timestampOfPost, bypassCheck=false) => {
    let arr = await Promise.all([E.lastBlendTime(), E.getUser(userID)]);
    let lastBlend = arr[0];
    let user = arr[1];
    let lastDrink = user.data().lastDrinkTimestamp;
    // the timestamp they drank needs to be BEFORE the timestamp the blend was posted
    // or in other words, if they've drank AFTER the blend timestamp, they've already drank today!
    if (lastDrink > lastBlend && bypassCheck == false) {
        return Promise.resolve(false);
    }
    // otherwise, they're good to drink!
    let newData = {
        count: user.data().count + 1,
        lastDrinkTimestamp: timestampOfPost,
    }
    return E.updateUser(userID, newData);
}