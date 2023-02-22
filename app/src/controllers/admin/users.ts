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
  const user = await DatabaseEngine.getUsersCollection().findOne({ _id: new ObjectId(req.params.id) });
  return res.render("users/edit.ejs", { user: user, roles: Role });
}

/**
 * Adds a new user
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to user create page
 */
export async function handleCreateUser(req: Request, res: Response) {
  try {
    if (!req.body.username || !req.body.email || !req.body.password || !req.body.role) throw "Campos em falta.";
    if (req.body.password && req.body.password.length < 6) throw "Password tem de ter pelo menos 6 caracteres.";

    const userExists = await DatabaseEngine.getUsersCollection().findOne({ email: req.body.email });
    if (userExists) {
      throw "Email já em uso.";
    }

    const user = req.body;
    await DatabaseEngine.getUsersCollection().insertOne(user);
    req.flash("success_message", "Utilizador criado com sucesso.");
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
    if (!req.body.role) throw "Campos em falta."

    const { role } = req.body;
    await DatabaseEngine.getUsersCollection().updateOne({ _id : new ObjectId(req.params.id) }, { $set: { role } });
    req.flash("success_message", "Utilizador atualizado com sucesso.");
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
export async function handleDeleteUser(request: Request, response: Response) {
  try {  
    const currentUser = request.user as User;
    if (request.params.id == currentUser._id) throw "Não é possível eliminar a própria conta.";
    await DatabaseEngine.getUsersCollection().deleteOne({ _id: new ObjectId(request.params.id) });
    return response.json({})
  } catch (e) {
    return response.status(500).json(JSON.stringify(e));
  }
}

/**
 * Get users
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array containing users and number of records for datatables
 */
export async function handleGetUsers(request: Request, response: Response) {
  try {
    const projection: any = { "password": 0 };
    const data = await getDatatablesData("users", projection, request.query);
    return response.json(data);
  }
  catch (e) {
    return response.status(500).json(JSON.stringify(e));
  }
}

/**
 * Get User fields
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of strings containing the fields
 */ 
export async function handleGetUserFields(request: Request, response: Response) {
  try {
    const projection = { "password": 0 };
    const find = {};
    const collectionName = DatabaseEngine.getUsersCollectionName();
    const fields = await getCollectionFields(collectionName, find, projection);
    return response.json(fields);
  } catch (e) {
    return response.status(500).json(JSON.stringify(e));
  }
}