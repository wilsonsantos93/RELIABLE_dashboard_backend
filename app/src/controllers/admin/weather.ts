import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { getCollectionFields } from "../../utils/database.js";

/**
 * Gets weather fields for specific region
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of strings containing all fields 
 */
export async function handleGetWeatherFields(request: Request, response: Response) {
  try {
    const projection = {};
    const find = { regionBorderFeatureObjectId: new ObjectId(request.params.id) };
    const collectionName = DatabaseEngine.getWeatherCollectionName();
    const fields = await getCollectionFields(collectionName, find, projection);
    fields.push("date");
    return response.json(fields);
  } catch (e) {
    return response.status(500).json(JSON.stringify(e));
  }
}

/**
 * Client requests all the weather data to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteAllWeather(req: Request, res: Response) {  
  try {
    await DatabaseEngine.getWeatherCollection().deleteMany({});
    req.flash("success_message", "Server successfully cleared weather information from the database.");
  } catch (e) {
    if (e && e.codeName === "NamespaceNotFound") {
      req.flash("error_message", "Weather information collection doesn't exist in the database (was probably already deleted).");
    } else if (e) {
      req.flash("error_message", JSON.stringify(e));
    }
  }
  return res.redirect("/home")
}

/**
 * Client requests a weather document to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteWeather(req: Request, res: Response) {
  try {
    await DatabaseEngine.getWeatherCollection().deleteOne({ _id: new ObjectId(req.params.id)});
    return res.json({});
  } catch (e) {
      console.error(e);
      return res.status(500).json(JSON.stringify(e));
  }
}