import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { DatabaseEngine } from "../../configs/mongo.js";
import { hashPassword } from "../../auth/helpers";
import { Role } from "../../types/User";
import { decrypt } from "../../utils/encrypt.js";

const router = Router();

// Route that handles user login
router.post('/login', function(req, res, next) { 
    passport.authenticate("local", (error: any, user: any, info: any) => {

        if (error) return res.status(500).json({
            error: error.message
        })

        if (!user) return res.status(401).json({
            error: 'Wrong Username/Password combination.'
        })

        const date = new Date().valueOf();

        const payload = {
            iat: Math.floor(date/1000),
            exp: Math.floor(date/1000) + 60*60*24,
            user_id: user.id
        }

        if (user.locations && user.locations.length) user.locations = decrypt(user.locations);

        jwt.sign(payload, '8gj48jfog84basd8f1h3rhq9rghrav', (error, jwtoken) => {
            if (error) return res.status(400).json({ error: error.message })
            return res.json({
                user,
                jwt: jwtoken
            })
        })
        
    })(req, res, next)
});

router.post("/register", async function(req, res, next) { 
    try {
        if (!req.body.email || !req.body.password || !req.body.confirmPassword) throw "Missing fields";
        if (req.body.password.length < 6 || req.body.confirmPassword < 6) throw "Password must have at least 6 characters";
        if (req.body.password != req.body.confirmPassword) throw "Passwords do not match";
    
        const userExists = await DatabaseEngine.getUsersCollection().findOne({ email: req.body.email });
        if (userExists) {
          throw "Email already exists.";
        }
    
        const user = req.body;
        const passwordHash = await hashPassword(user.password);
        user.password = passwordHash;
        user.role = Role.USER;
    
        await DatabaseEngine.getUsersCollection().insertOne(user);
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(e);
    }
});

export default router;