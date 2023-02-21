import { NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import passport from "passport";
import { Role } from "../../models/User";

export function getLoginPage (req: Request, res: Response) {
  res.render("login.ejs");
}

export async function handleLogin (req: Request, res: Response) {
  passport.authenticate("local", (error, user, info) => {
    if (error) {
      req.flash("error", error.message);
      return res.redirect("/admin/login");
    }

    if (!user) {
      req.flash("error", info.message);
      return res.redirect("/admin/login");
    }

    if (user) {
      if (user.role == Role.ADMIN) {
        req.logIn(user, { session: true }, (error) => {
          if (error) {
            req.flash("error", error); 
            res.redirect("/admin/login");
          } 
          return res.redirect("/admin/home"); 
        })
      }
      else {
        req.flash("error", "Utilizador não autorizado.");
        return res.redirect("/admin/login"); 
      }
    } 
  })(req, res);
};


export function handleLogout (req: Request, res: Response, next: NextFunction) {
  req.logout(function(err) {
    if (err) { 
      req.flash('error_message', 'An error occurred.');
      return next();
    }
    req.flash('success_message', 'You are succesfully logged out.');
    return res.redirect('/admin/login');
  });
}