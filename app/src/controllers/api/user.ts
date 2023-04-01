import { User } from "../../types/User.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../auth/helpers.js";
import { decrypt, encrypt } from "../../utils/encrypt.js";
import { getObjectValue } from "../../utils/database.js";
import { authenticateAPI } from "../../utils/routes.js";
import passport from "passport";

const ALERT_NUM_DAYS_AHEAD = parseInt(process.env.ALERT_NUM_DAYS_AHEAD) || 3;
const DB_REGION_NAME_FIELD = process.env.DB_REGION_NAME_FIELD;

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
        
        const weatherFields = await DatabaseEngine.getWeatherMetadataCollection().find().toArray();
        if (!weatherFields || !weatherFields.length) return res.json([]);

        const weatherField = weatherFields.find((f:any) => f.main);
        if (!weatherField) return res.json([]);

        const currentUser: User | null = await new Promise((resolve) => {
            passport.authenticate('api-jwt', (error:any, user: User) => {
                console.log(error, user);
                if (error || !user) return resolve(null);
                return resolve(user);
            })(req, res)
        });

        //const currentUser = req.user as User || null;
        let features: any[] = [];
        let locations: any[] = [];

        if (currentUser) {
            const userDocument = await DatabaseEngine.getUsersCollection().findOne({ _id : new ObjectId(currentUser._id) });
            locations = userDocument.locations.map((l:any) => JSON.parse(decrypt(l)))
                        .map((l:any) => { return {...l, lat: l.position.lat, lng: l.position.lng }});
        
        } else if (req.query.lat && req.query.lng) {
            locations = [{ lat: parseFloat(req.query.lat as string), lng: parseFloat(req.query.lng as string) }];
        } else {
            return res.status(500).json("Must specify lat and lng");
        }

        for (const location of locations) {
            const feature = await DatabaseEngine.getFeaturesCollection().findOne({
                "geometry": {
                    $geoIntersects: {
                        $geometry: {
                        "type": "Point",
                        "coordinates": [location.lng, location.lat]
                        }
                    }
                }
            });

            if (!feature) continue;

            const stringId = feature._id.toString();
            const ix = features.findIndex((f:any) => f._id == stringId);
            if (ix < 0) {
                feature.locations = [location];
                features.push({ _id: feature._id, properties: feature.properties });
            } else {
                features[ix].locations.push(location);
            }
        }

        const regionsIds = features.map(f => f._id);
        if (!regionsIds.length) return res.status(404).json("Region not found");

        const datesCollectionName = DatabaseEngine.getWeatherDatesCollectionName();
        const startDate = new Date();
        const endDate = new Date(new Date().valueOf() + (ALERT_NUM_DAYS_AHEAD * 24 * 60 * 60 * 1000));

        const weatherFieldAlertable = weatherField.ranges.filter((r:any) => r.alert);
        const orQuery = [];
        for (const alertable of weatherFieldAlertable) {
            let min = alertable.min;
            let max = alertable.max;
            if (!alertable.min || isNaN(alertable.min)) min = -Infinity;
            if (!alertable.max || isNaN(alertable.max)) max = Infinity;
            orQuery.push({ 
                [`weather.${weatherField.name}`]: { $gte: min, $lt: max }
            })
        }

        const alerts = await DatabaseEngine.getWeatherCollection().aggregate([
            { 
                $match: { 
                    regionBorderFeatureObjectId: { $in: regionsIds },
                    $or: orQuery
                }
            },
            { $lookup: {
                from: datesCollectionName,
                localField: 'weatherDateObjectId',
                foreignField: '_id',
                as: 'date',
                pipeline: [
                    {
                        $match: { "date": { $gt: startDate, $lt: endDate } }
                    }
                ]
              }
            },
            {
                $match: { date: { $ne: [] } }
            },
            {
                $project: { [`weather.${weatherField.name}`]: 1, date: 1, "regionBorderFeatureObjectId": 1, "weatherDateObjectId": 1}
            }
        ]).toArray();

        for (const alert of alerts) {
            const feature = features.find(f => f._id.toString() == alert.regionBorderFeatureObjectId);
            alert.regionName = getObjectValue(DB_REGION_NAME_FIELD, feature);
            alert.locations = feature.locations;
        }

        alerts.sort((a,b) => new Date(a.date[0].date).valueOf() - new Date(b.date[0].date).valueOf())

        return res.json({ numDaysAhead: ALERT_NUM_DAYS_AHEAD, alerts });
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
}