import { DatabaseEngine } from "../configs/mongo.js";
// @ts-ignore
import { Request, Response } from "express-serve-static-core";

/**
 * Client requests to delete all collections
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteAll(req: Request, res: Response) {
  console.log("Client requested to clear the all collections.");

  let successMsgs = [];
  let errorMsgs = [];

  // Drop region borders collection
  try {
    await DatabaseEngine.getFeaturesCollection().deleteMany({});
    successMsgs.push("Server successfully cleared region borders from the database.");
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      errorMsgs.push("Region borders collection doesn't exist in the database (was probably already deleted).");
    } else if (error) {
      errorMsgs.push(JSON.stringify(error));
    }
  }

  // Drop weather dates collection
  try {
    await DatabaseEngine.getWeatherDatesCollection().deleteMany({});
    successMsgs.push("Server successfully cleared weather saved dates from the database.");
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      errorMsgs.push("Weather saved dates collection doesn't exist in the database (was probably already deleted).");
    } else if (error) {
      errorMsgs.push(JSON.stringify(error));
    }
  }

  // Drop weather information collection
  try {
    await DatabaseEngine.getWeatherCollection().deleteMany({});
    successMsgs.push("Server successfully cleared weather information from the database.");
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      errorMsgs.push("Weather information collection doesn't exist in the database (was probably already deleted).");
    } else if (error) {
      errorMsgs.push(JSON.stringify(error));
    }
  }

  req.flash("error_message", errorMsgs);
  req.flash("success_message", successMsgs);
  return res.redirect("/admin/home");
}

/**
 * Deletes the region borders collection from the databaseResponse
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteRegionBorders(req: Request, res: Response) {
  console.log("Client requested to clear the region borders collection.");

  // Drop collection and send response to the server
  try {
    await DatabaseEngine.getFeaturesCollection().deleteMany({});
    req.flash("success_message", "Server successfully cleared region borders from the database.");
  } catch (error) {
    if (error && error.codeName === "NamespaceNotFound") {
      req.flash("error_message", "Region borders collection doesn't exist in the database (was probably already deleted).");
    } else if (error) {
      req.flash("error_message", JSON.stringify(error));
    }
  }
  return res.redirect("/admin/home");
}

/**
 * Client requests the weatherDates collection to be deleted
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleDeleteWeatherDates(req: Request, res: Response) {
  console.log("Client requested to clear the weather saved dates collection.");

  // Clear collection and send response to the server
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
  return res.redirect("/admin/home");
}

/**
 * Client requests the weather collection to be deleted
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
