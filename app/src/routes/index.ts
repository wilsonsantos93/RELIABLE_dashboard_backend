import { NextFunction, Request, Response, Router } from "express";
import configRouter from "./config.js";
import regionBordersRouter from "./features.js";
import librariesRouter from "./libraries.js";
import mapRouter from "./map.js";
import apiRouter from "./api.js";
import weatherRouter from "./weather.js";
import session from "express-session";
import passport from "passport";
import { User } from "../models/User";
import flash from "connect-flash";
import MongoStore from 'connect-mongo';

const router = Router();

// Use session
const reliableSession = session({
    secret: "WkvKdh0HM0R9vNgg",
    name: 'reliable-session',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({
        mongoUrl: `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_URL}/${process.env.DB_NAME}`,
        collectionName: 'sessions'
    }),
    cookie: { secure: false, maxAge: 30 * 60 * 1000 } // 30min
})

// Use flash messages
function flashLocals(req: Request, res: Response, next: NextFunction) {
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    return next();
}

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
router.use('/admin', reliableSession, passport.initialize(), passport.session(), flash(), flashLocals, setLocals, configRouter);
router.use('/api', apiRouter);
router.use('/api/weather', reliableSession, passport.initialize(), passport.session(), weatherRouter);
//router.use('/api/region', reliableSession, passport.initialize(), passport.session(), regionBordersRouter);
/* router.use('/regions', reliableSession, passport.initialize(), passport.session(), regionBordersRouter);
router.use("/libraries", reliableSession, passport.initialize(), passport.session(), librariesRouter);
router.use("/map", reliableSession, passport.initialize(), passport.session(), mapRouter); */

export default router;