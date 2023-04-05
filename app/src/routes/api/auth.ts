import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { DatabaseEngine } from "../../configs/mongo.js";
import { hashPassword } from "../../auth/helpers.js";
import { Role } from "../../types/User.js";
import { createJWTtoken } from "../../utils/routes.js";
import { decrypt } from "../../utils/encrypt.js";

const router = Router();

// Route that handles user login
router.post('/login', function(req, res, next) { 
    passport.authenticate("local", async (error: any, user: any, info: any) => {

        if (error) return res.status(500).json(error.message);
        if (!user) return res.status(404).json('Wrong Username/Password combination.');
        
        try {
            let decryptedLocations;
            if (user.locations && user.locations.length) {
                decryptedLocations = user.locations.map((loc:any) => JSON.parse(decrypt(loc)));
                user.locations = decryptedLocations;
            }
            else user.locations = [];
            const data = await createJWTtoken(user);
            return res.json(data);
        } catch (e:any) {
            return res.status(500).json("Error generating JWT.");
        }
    })(req, res, next)
});

router.post("/register", async function(req, res, next) { 
    try {
        if (!req.body.username || !req.body.password || !req.body.confirmPassword) throw "Missing fields";
        if (req.body.password.length < 6 || req.body.confirmPassword < 6) throw "Password must have at least 6 characters";
        if (req.body.password != req.body.confirmPassword) throw "Passwords do not match";

        const userExists = await DatabaseEngine.getUsersCollection().findOne({ email: req.body.username });
        if (userExists) throw "EMAIL_ALREADY_IN_USE";

        const user: any = {
            username: null, 
            email: req.body.username,
            locations: []
        };
        const passwordHash = await hashPassword(req.body.password);
        user.password = passwordHash;
        user.role = Role.USER;
    
        await DatabaseEngine.getUsersCollection().insertOne(user);
        
        passport.authenticate('local', async (err: any, user: any) => {
            if (err) throw err;
            if (!user) res.status(401).json("User not found");
            try {
                const data = await createJWTtoken(user);
                return res.json(data);
            } catch (e:any) {
                console.error(new Date().toJSON(), e);
                return res.status(500).json("Error generating JWT");
            }
        })(req, res, next)

    } catch (e) {
        console.error(new Date().toJSON(), e);
        return res.status(500).json(e);
    }
});

export default router;