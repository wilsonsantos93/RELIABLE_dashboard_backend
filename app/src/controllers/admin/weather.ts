import { DatabaseEngine } from "../../configs/mongo";
import { Request, Response } from "express-serve-static-core";

/**
 * Client requests the weather data to be deleted
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteWeather(req: Request, res: Response) {
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