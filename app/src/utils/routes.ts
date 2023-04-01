import { NextFunction, Request, Response } from "express";
import { Role, User } from "../types/User.js";
import passport from "passport";
import { decrypt } from "./encrypt.js";
import jwt from "jsonwebtoken";

/**
 * Check if user is allowed through roles
 */
function isAuthorized(allowedRoles: string[], userRole: string) {
    if (allowedRoles.includes(userRole)) return true
    return false
}

/**
 * Generate JWT token and data for auth
 */


export async function createJWTtoken(user: any) {
    const date = new Date().valueOf();

    const payload = {
        iat: Math.floor(date/1000),
        exp: Math.floor(date/1000) + 60*60*24,
        user_id: user.id || user._id
    }

    try {
        const data = await new Promise((resolve, reject) => {
            jwt.sign(payload, '8gj48jfog84basd8f1h3rhq9rghrav', (error, jwtoken) => {
                if (error) return reject(error);
                return resolve({
                    user,
                    jwt: jwtoken
                });
            })
        })
        return data;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

/**
 * Authentication Middleware
 */
export function authenticateAPI(...allowed_roles: string[] | null) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Try to authenticate through Cookies if theres is no Authorization Header present
        if (req.isAuthenticated() && !req.headers['authorization']) {
            const user = req.user as User;
            if (!allowed_roles.length || isAuthorized(allowed_roles, user.role)) return next();
            else return res.status(403).json({ error: 'Forbidden' });
        }
        // Authentication through Authorization Header allowing multiple strategies
        else return passport.authenticate(['api-basic', 'api-jwt'], (error:any, user: User) => {
            if (error) return res.status(500).json({ error: 'Authentication error' });
            if (!user) return res.status(401).json({ error: 'Unauthorized' });
            if (!allowed_roles.length || isAuthorized(allowed_roles, user.role)) {
                req.logIn(user, { session: false }, (error) => {
                    if (error) return res.status(500).json({ error: 'Authentication error' });
                    return next();
                })
            } else return res.status(403).json({ error: 'Forbidden' });
        })(req, res, next)
    }
}

/**
 * Forward home if authenticated, login if not
 */
export const forwardAuthenticatedAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/home');     
}

/**
 * Check if user is authenticated and is admin
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        const user = req.user as User;
        if (user.role == Role.ADMIN) return next();
    }
    else { 
        req.flash('error_message', 'Please log in to access the requested page.');
    }
    return res.redirect('/login');
}