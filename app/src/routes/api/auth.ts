import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

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

        jwt.sign(payload, '8gj48jfog84basd8f1h3rhq9rghrav', (error, jwtoken) => {
            if (error) return res.status(400).json({ error: error.message })
            return res.json({
                user,
                jwt: jwtoken
            })
        })
        
    })(req, res, next)
});

export default router;