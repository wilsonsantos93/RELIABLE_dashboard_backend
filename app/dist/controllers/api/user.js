import { DatabaseEngine } from "../../configs/mongo.js";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../auth/helpers.js";
import { decrypt, encrypt } from "../../utils/encrypt.js";
import { generateAlerts } from "../../utils/weather.js";
export async function saveLocations(req, res) {
    try {
        const currentUser = req.user;
        const data = req.body;
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(currentUser._id) }, { $set: Object.assign({}, data) });
        return res.json({});
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function updatePassword(req, res) {
    try {
        if (!req.body.password)
            throw "PASSWORD_MISSING";
        if (!req.body.confirmPassword)
            throw "CONFIRM_PASSWORD_MISSING";
        if (req.body.password.length < 6)
            throw "PASSWORD_MUST_HAVE_SIX_CHARACTERS";
        if (req.body.password != req.body.confirmPassword)
            throw "PASSWORDS_DO_NOT_MATCH";
        const currentUser = req.user;
        const password = await hashPassword(req.body.password);
        const data = { password };
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(currentUser._id) }, { $set: data });
        return res.json({});
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function getLocations(req, res) {
    try {
        const currentUser = req.user;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((loc) => JSON.parse(decrypt(loc)));
        return res.json(locations);
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function createLocation(req, res) {
    try {
        const currentUser = req.user;
        const data = req.body;
        data._id = new ObjectId();
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(currentUser._id) });
        if (!userDocument.locations || !Array.isArray(userDocument.locations))
            userDocument.locations = [];
        userDocument.locations.push(encrypt(JSON.stringify(data)));
        //userDocument.locations.push(data);
        const locations = userDocument.locations;
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(currentUser._id) }, { $set: { locations } });
        return res.json(data);
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function updateLocation(req, res) {
    try {
        const currentUser = req.user;
        const data = req.body;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((location) => JSON.parse(decrypt(location)));
        const ix = locations.findIndex((location) => location._id.toString() == req.params.id);
        if (ix < 0)
            throw "Error updating location";
        locations[ix] = data;
        const encryptedLocations = locations.map((location) => encrypt(JSON.stringify(location)));
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(currentUser._id) }, { $set: { locations: [...encryptedLocations] } });
        return res.json({});
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function deleteLocation(req, res) {
    try {
        const currentUser = req.user;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((l) => JSON.parse(decrypt(l)))
            .filter((l) => l._id.toString() != req.params.id)
            .map((l) => encrypt(JSON.stringify(l)));
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(currentUser._id) }, { $set: { locations } });
        return res.json({});
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function getAlerts(req, res) {
    try {
        const currentUser = req.user;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(currentUser._id) });
        let locations = [];
        if (userDocument.locations && userDocument.locations.length) {
            locations = userDocument.locations.map((l) => JSON.parse(decrypt(l)))
                .map((l) => { return Object.assign(Object.assign({}, l), { lat: l.position.lat, lng: l.position.lng }); });
        }
        const alerts = await generateAlerts(locations);
        return res.json(alerts);
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function updateUserPreferences(req, res) {
    try {
        const currentUser = req.user;
        const data = req.body;
        if (!data.hasOwnProperty('alertByEmail'))
            return res.status(404).json("Data not found");
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(currentUser._id) });
        if (!userDocument)
            return res.status(404).json("User not found");
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(currentUser._id) }, { $set: { alertByEmail: data.alertByEmail } });
        return res.json({});
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
}
export async function unsubscribeEmail(req, res) {
    try {
        if (!req.params.id)
            return res.status(500).json("Missing id");
        const userId = req.params.id;
        if (!ObjectId.isValid(userId))
            throw "Invalid id";
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(userId) });
        if (!userDocument)
            throw "Unsubscribe - User not found";
        await DatabaseEngine.getUsersCollection().updateOne({ _id: new ObjectId(userId) }, { $set: { alertByEmail: false } });
        return res.render("users/unsubscribed.ejs");
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        return res.render('error');
    }
}
//# sourceMappingURL=user.js.map