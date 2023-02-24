import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { Role, User } from "../../types/User.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { getCollectionFields, getDatatablesData } from "../../utils/database.js";

/**
 * Get Users page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders users page
 */
export function getUsersPage (req: Request, res: Response) {
  return res.render("users/index.ejs", { data: [] });
}

/**
 * Get User Create page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders users create page
 */
export async function getCreateUserPage (req: Request, res: Response) {
  return res.render("users/create.ejs", { roles: Role });
}

/**
 * Get User edit page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders user edit page
 */
export async function getEditUserPage (req: Request, res: Response) {
  try {
    const projection = { password: 0 };
    const user = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(req.params.id) }, { projection });
    if (!user) throw "User not found.";
    return res.render("users/edit.ejs", { data: user, roles: Role });
  } catch (e) {
    return res.redirect("/users");
  }
}

/**
 * Adds a new user
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to user create page
 */
export async function handleCreateUser(req: Request, res: Response) {
  try {
    if (!req.body.username || !req.body.email || !req.body.password || !req.body.role) throw "Missing fields";
    if (req.body.password && req.body.password.length < 6) throw "Password must have at least 6 characters";

    const userExists = await DatabaseEngine.getUsersCollection().findOne({ email: req.body.email });
    if (userExists) {
      throw "Email already exists.";
    }

    const user = req.body;
    await DatabaseEngine.getUsersCollection().insertOne(user);
    req.flash("success_message", "User created successfully!");
    return res.redirect("/users");

  } catch (e) {
    req.flash("error_message", JSON.stringify(e));
    req.flash("data", req.body);
    return res.redirect("/users/create");
  }
} 

/**
 * Updates a specific user
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to previous page
 */
export async function handleUpdateUser(req: Request, res: Response) {
  try {
    if (!req.body.role) throw "Missing fields"
    const currentUser = req.user as User;
    let data;
    if (req.params.id == currentUser._id) {
      if (!req.body.email) throw "Missing email address";
      if (req.body.role != currentUser.role) throw "Impossible to change your own role.";
      data = req.body;
    } else {
      data = { role: req.body.role };
    }
    await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(req.params.id) }, { $set: { ...data } });
    req.flash("success_message", "User updated successfully!");
    return res.redirect("/users");
  } catch (e) {
    req.flash("error_message", JSON.stringify(e));
    return res.redirect("back");
  }
} 

/**
 * Deletes a specific user
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteUser(req: Request, res: Response) {
  try {  
    const currentUser = req.user as User;
    if (req.params.id == currentUser._id) throw "Impossible to delete your own account.";
    await DatabaseEngine.getUsersCollection().deleteOne({ _id: new ObjectId(req.params.id) });
    return res.json({})
  } catch (e) {
    return res.status(500).json(JSON.stringify(e));
  }
}

/**
 * Get users
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array containing users and number of records for datatables
 */
export async function handleGetUsers(req: Request, res: Response) {
  try {
    const projection: any = { "password": 0 };
    const data = await getDatatablesData("users", projection, req.query);
    return res.json(data);
  }
  catch (e) {
    return res.status(500).json(JSON.stringify(e));
  }
}

/**
 * Get User fields
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of strings containing the fields
 */ 
export async function handleGetUserFields(req: Request, res: Response) {
  try {
    const projection = { "password": 0 };
    const find = {};
    const collectionName = DatabaseEngine.getUsersCollectionName();
    const fields = await getCollectionFields(collectionName, find, projection);
    return res.json(fields);
  } catch (e) {
    return res.status(500).json(JSON.stringify(e));
  }
}