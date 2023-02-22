import { NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import passport from "passport";
import { Role } from "../../types/User.js";

/**
 * Get the login page
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns Renders login page
 */
export function getLoginPage (req: Request, res: Response) {
  res.render("login.ejs");
}

/**
 * Logs in admin user
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns Redirects to home or login page
 */
export async function handleLogin (req: Request, res: Response) {
  passport.authenticate("local", (error, user, info) => {
    if (error) {
      req.flash("error", error.message);
      return res.redirect("/login");
    }

    if (!user) {
      req.flash("error", info.message);
      return res.redirect("/login");
    }

    if (user) {
      if (user.role == Role.ADMIN) {
        req.logIn(user, { session: true }, (error) => {
          if (error) {
            req.flash("error", error); 
            res.redirect("/login");
          } 
          return res.redirect("/home"); 
        })
      }
      else {
        req.flash("error", "Utilizador não autorizado.");
        return res.redirect("/login"); 
      }
    } 
  })(req, res);
};

/**
 * Logs out admin user
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 * @returns Redirects to login page
 */
export function handleLogout (req: Request, res: Response, next: NextFunction) {
  req.logout(function(err) {
    if (err) { 
      req.flash('error_message', 'An error occurred.');
      return next();
    }
    req.flash('success_message', 'You are succesfully logged out.');
    return res.redirect('/login');
  });
}