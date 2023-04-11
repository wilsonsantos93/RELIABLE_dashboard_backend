import { NextFunction, Request, Response, Router } from "express";
import adminRouter from "./admin/index.js";
import regionBordersRouter from "./api/regions.js";
import librariesRouter from "./api/libraries.js";
import mapRouter from "./api/map.js";
import apiRouter from "./api/auth.js";
import weatherRouter from "./api/weather.js";
import userRouter from "./api/user.js";
import session from "express-session";
import passport from "passport";
import { User } from "../types/User";
import flash from "connect-flash";
import MongoStore from 'connect-mongo';
import { readGeneralMetadata } from "../utils/metadata.js";

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
    cookie: { secure: false, maxAge: 90 * 60 * 1000 } // 90min
})

// Use flash messages
function flashLocals(req: Request, res: Response, next: NextFunction) {
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    res.locals.data = req.flash("data");
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
router.use('/admin', reliableSession, passport.initialize(), passport.session(), flash(), flashLocals, setLocals, adminRouter);
router.use('/api', apiRouter);
router.use('/api/weather', reliableSession, passport.initialize(), passport.session(), weatherRouter);
router.use('/api/region', reliableSession, passport.initialize(), passport.session(), flash(), flashLocals, regionBordersRouter);
router.use("/api/map", reliableSession, passport.initialize(), passport.session(), mapRouter);
router.use("/api/user", reliableSession, passport.initialize(), passport.session(), userRouter);
router.use("/libs", librariesRouter);

router.get("/api/metadata", async (req, res) => {
    try {
        const { DB_REGION_NAME_FIELD } = await readGeneralMetadata();
        return res.json({
            DB_REGION_NAME_FIELD: DB_REGION_NAME_FIELD
        })
    } catch (e) {
        return res.status(500).json("Error getting data.");
    }
}); 

export default router;