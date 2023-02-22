import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";

/**
 * Client requests all weather dates data to be deleted
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleDeleteWeatherDates(req: Request, res: Response) {
  try {
    await DatabaseEngine.getWeatherDatesCollection().deleteMany({});
    req.flash("success_message", "Server successfully cleared weather saved dates from the database.");
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      req.flash("error_message", "Weather saved dates collection doesn't exist in the database (was probably already deleted).");
    } else if (error) {
      req.flash("error_message", JSON.stringify(error));
    }
  }
  return res.redirect("/home");
}