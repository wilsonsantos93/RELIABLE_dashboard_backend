import { NextFunction, Request, Response } from "express";
import { Role, User } from "../models/User.js";
import passport from "passport";

/**
 * Check if user is allowed through roles
 */
function isAllowed(allowedRoles: string[], userRole: string) {
    if (allowedRoles.includes(userRole)) return true
    return false
}

/**
 * Authentication Middleware
 */
export function authenticateAPI(...allowed_roles: string[] | null) {
    if (typeof allowed_roles === 'string') {
        allowed_roles = [allowed_roles];
    }

    return (req: Request, res: Response, next: NextFunction) => {
        // Try to authenticate through Cookies if theres is no Authorization Header present
        if (req.isAuthenticated() && !req.headers['authorization']) {
            const user = req.user as User;
            if (!allowed_roles.length || isAllowed(allowed_roles, user.role)) return next();
            else return res.status(403).json({ error: 'Forbidden' });
        }
        // Authentication through Authorization Header allowing multiple strategies
        else return passport.authenticate(['api-basic', 'api-jwt'], (error, user) => {
            if (error) return res.status(500).json({ error: 'Authentication error' });
            if (!user) return res.status(401).json({ error: 'Unauthorized' });
            if (!allowed_roles.length || isAllowed(allowed_roles, user.roles)) {
                req.logIn(user, { session: false }, (error) => {
                    if (error) return res.status(500).json({ error: 'Authentication error' });
                    return next();
                })
            } else return res.status(403).json({ error: 'Forbidden' });
        })(req, res, next)
    }
}

// Forward admin
export const forwardAuthenticatedAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/admin/home');     
}

// Check if user is logged in and is admin
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        const user = req.user as User;
        if (user.role == Role.ADMIN) return next();
    }
    else { 
        req.flash('error_message', 'Please log in to access the requested page.');
    }
    return res.redirect('/admin/login');
}