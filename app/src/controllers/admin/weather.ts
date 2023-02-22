import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";

/**
 * Client requests the weather data to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteAllWeather(req: Request, res: Response) {
    console.log("Client requested to clear the weather information collection.");
  
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
 * Client requests the weather data to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteWeather(req: Request, res: Response) {
  console.log("Client requested to delete a weather document.");
  try {
    await DatabaseEngine.getWeatherCollection().deleteOne({ _id: new ObjectId(req.params.id)});
    req.flash("success_message", "Server successfully cleared weather information from the database.");
    return res.json();
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      res.status(500).json("Weather information collection doesn't exist in the database (was probably already deleted.");
    } else if (error) {
      res.status(500).json(JSON.stringify(error));
    }
  }
}