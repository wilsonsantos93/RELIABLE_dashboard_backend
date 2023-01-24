/**
 * Module dependencies
 */
import { DatabaseEngine } from "../configs/mongo.js";
import { User, Role } from "../models/User.js";
import { Strategy as LocalStrategy } from "passport-local";
import { BasicStrategy } from "passport-http";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt"; 
import { UniqueTokenStrategy } from "passport-unique-token";
import { comparePassword } from "./helpers.js";
import { PassportStatic } from "passport";
import { ObjectId } from "mongodb";

/* const uniqueTokenstrategyOptions = {
    tokenQuery: 'custom-token',
    tokenParams: 'custom-token',
    tokenField: 'custom-token',
    tokenHeader: 'custom-token',
    failOnMissing: false
}; */
  
export default (passport: PassportStatic) => {

    /**
     * Session Serialize Function
     */
    passport.serializeUser(function(user: User, done) {
        return done(null, user._id)
    })

    /**
     * Session Deserialize Function
     */
    passport.deserializeUser(function(id:string, done) {
        const userId = new ObjectId(id);
        const UserCollection = DatabaseEngine.getUsersCollection();
        UserCollection.findOne({ _id: userId }, (error, user) => {
            if (error) return done(error)
            return done(null, user)
        })
    })


    /**
     * User Authentication (stateless)
     */
    passport.use('api-basic', new BasicStrategy(
        function (username, password, done) {
            const UserCollection = DatabaseEngine.getUsersCollection();
            UserCollection.findOne({ username: username }, async function (err, user) {
                if (err) return done(err);
                if (!user) return done(null, false);

                try {
                    const result = await comparePassword(user.password, password);
                    if (!result) return done(null, false);
                    done(null, user);
                } catch (err) {
                    return done(err);
                }
            })
        }
    ))


    /**
     * Local Authentication
     */
    passport.use('local', new LocalStrategy(
        function(username, password, done) {
            const UserCollection = DatabaseEngine.getUsersCollection();
            UserCollection.findOne({ username: username }, async function (err, user) {
                if (err) return done(err)
                if (!user) return done(null, false, { message: 'Nome de utilizador incorreto.' })

                try {
                    const match = await comparePassword(user.password, password);
                    if (!match) return done(null, false, { message: 'Password incorreta.' })
                    return done(null, user)
                } catch (err) {
                    return done(err);
                }
            })
        }
    ))


    /**
     * API Authentication (JWT token)
     */
    passport.use('api-jwt', new JwtStrategy({
        secretOrKey: '8gj48jfog84basd8f1h3rhq9rghrav',
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
    }, function (jwt_payload, done) {
        const UserCollection = DatabaseEngine.getUsersCollection();
        UserCollection.findOne({ _id: jwt_payload.user_id }, function (err, user) {
            if (err) return done(err, false)
            if (!user) return done(null, false)
            return done(null, user)
        })
    }))


    /**
     * API Authentication (API key)
     */
    /* passport.use('api-key', new UniqueTokenStrategy((token, done) => {
        const UserCollection = DatabaseEngine.getUsersCollection();
        UserCollection.findOne({ token: token, //expireToken: { $gt: Date.now() },
        }, function (err, user) {
            if (err) return done(err);
            if (!user) return done(null, false);
            return done(null, user);
            },
        );
        }),
    ) */
}