import { NextFunction, Request, Response, Router } from "express";
import configRoutes from "./config";
import regionBordersRouter from "./features";
import librariesRouter from "./libraries";
import mapRouter from "./map";
import weatherRouter from "./weather";
import session from "express-session";
import passport from "../auth";
import { User } from "../models/User";

const router = Router();

// Use session
const reliableSession = session({
    secret: "WkvKdh0HM0R9vNgg",
    name: 'reliable-session',
    resave: true,
    saveUninitialized: true
})

/**
 * Set Locals Middleware
 */
function setLocals(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated()) {
        res.locals.user = req.user as User;
    }
    else { 
        res.locals.user = null;
    }
    return next()
}

// Use routes
router.use('/admin',  reliableSession, passport.initialize(), passport.session(), setLocals, configRoutes);
router.use('/regions', reliableSession, passport.initialize(), passport.session(), regionBordersRouter);
router.use("/libraries", reliableSession, passport.initialize(), passport.session(), librariesRouter);
router.use('/weather', reliableSession, passport.initialize(), passport.session(), weatherRouter);
router.use("/map", reliableSession, passport.initialize(), passport.session(), mapRouter);

export default router;