import { User } from "../../types/User.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../auth/helpers.js";
import { decrypt, encrypt } from "../../utils/encrypt.js";
import { generateAlerts } from "../../utils/weather.js";

export async function saveLocations(req: Request, res: Response) {
    try {
        const currentUser = req.user as User;
        const data = req.body;
        await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(currentUser._id) }, { $set: { ...data } });
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}

export async function updatePassword(req: Request, res: Response) {
    try {
        if (!req.body.password) throw "PASSWORD_MISSING";
        if (!req.body.confirmPassword) throw "CONFIRM_PASSWORD_MISSING";
        if (req.body.password.length < 6) throw "PASSWORD_MUST_HAVE_SIX_CHARACTERS";
        if (req.body.password != req.body.confirmPassword) throw "PASSWORDS_DO_NOT_MATCH";

        const currentUser = req.user as User;
        const password = await hashPassword(req.body.password);
        const data = { password };
        await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(currentUser._id) }, { $set: data });
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}

export async function getLocations(req: Request, res: Response) {
    try {
        const currentUser = req.user as User;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id : new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((loc: any) => JSON.parse(decrypt(loc)));
        return res.json(locations);
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}

export async function createLocation(req: Request, res: Response) {
    try {
        const currentUser = req.user as User;
        const data = req.body;
        data._id = new ObjectId();
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id : new ObjectId(currentUser._id) });
        if (!userDocument.locations || !Array.isArray(userDocument.locations)) userDocument.locations = [];
        userDocument.locations.push(encrypt(JSON.stringify(data)));
        //userDocument.locations.push(data);
        const locations = userDocument.locations;
        await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(currentUser._id) }, { $set: { locations } });
        return res.json(data);
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}

export async function updateLocation(req: Request, res: Response) {
    try {
        const currentUser = req.user as User;
        const data = req.body;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id : new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((location: any) => JSON.parse(decrypt(location)));
        const ix = locations.findIndex((location:any) => location._id.toString() == data._id);
        if (ix < 0) throw "Error updating location";
        locations[ix] = data;
        const encryptedLocations = locations.map((location:any) =>  encrypt(JSON.stringify(location)));
        await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(currentUser._id) }, { $set: { locations: encryptedLocations } });
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}

export async function deleteLocation(req: Request, res: Response) {
    try {
        const currentUser = req.user as User;
        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id : new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((l:any) => JSON.parse(decrypt(l)))
                                        .filter((l: any) => l._id.toString() != req.params._id)
                                        .map((l:any) => encrypt(JSON.stringify(l)));

        await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(currentUser._id) }, { $set: { locations } });
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}

export async function getAlerts(req: Request, res: Response) {
    try {
        const currentUser = req.user as User;

        const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id : new ObjectId(currentUser._id) });
        const locations = userDocument.locations.map((l:any) => JSON.parse(decrypt(l)))
                    .map((l:any) => { return {...l, lat: l.position.lat, lng: l.position.lng }});
        
        const alerts = await generateAlerts(locations);
        return res.json(alerts);
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}