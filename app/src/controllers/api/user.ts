import { User } from "../../types/User.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { hashPassword } from "../../auth/helpers.js";

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
        if (!req.body.password) throw "Password missing";
        if (req.body.password.length < 6) throw "Password must have at least 6 characters";

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