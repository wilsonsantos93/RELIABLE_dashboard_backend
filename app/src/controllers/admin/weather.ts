import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";

/**
 * Client requests the weather data to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteAllWeather(req: Request, res: Response) {  
  // Drop collection and send response to the server
  try {
    await DatabaseEngine.getWeatherCollection().deleteMany({});
    req.flash("success_message", "Server successfully cleared weather information from the database.");
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      req.flash("error_message", "Weather information collection doesn't exist in the database (was probably already deleted).");
    } else if (error) {
      req.flash("error_message", JSON.stringify(error));
    }
  }
  return res.redirect("/admin/home")
}

/**
 * Client requests a weather data to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteWeather(req: Request, res: Response) {
  try {
    await DatabaseEngine.getWeatherCollection().deleteOne({ _id: new ObjectId(req.params.id)});
    return res.json({});
  } catch (error) {
      console.error(error);
      return res.status(500).json(JSON.stringify(error));
  }
}