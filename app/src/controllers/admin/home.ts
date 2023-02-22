import { Request, Response } from "express-serve-static-core";
import { DatabaseEngine } from "../../configs/mongo.js";

/**
 * Client requests get home or login page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to login page
 */
export function getIndexPage (req: Request, res: Response) {
  res.redirect('/login');
}

/**
 * Client requests the home page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders home page
 */
export async function getHomePage (req: Request, res: Response) {
  let data: any = { 
    totalRegions: null, 
    totalUsers: null, 
    totalDates: null, 
    totalWeather: null 
  };

  try {
    const totalRegions = await DatabaseEngine.getFeaturesCollection().estimatedDocumentCount();
    const totalUsers = await DatabaseEngine.getUsersCollection().estimatedDocumentCount();
    const totalDates = await DatabaseEngine.getWeatherDatesCollection().estimatedDocumentCount();
    const totalWeather = await DatabaseEngine.getWeatherCollection().estimatedDocumentCount();
    data = { totalDates, totalRegions, totalUsers, totalWeather };
  } catch (e) {
    console.error(e);
    req.flash("error_message", "Erro a obter dados.");
  }
  res.render("home.ejs", { data: data });
}

/**
 * Client requests to delete all collections
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to home page
 */
export async function handleDeleteAll(req: Request, res: Response) {
  console.log("Client requested to clear the all collections.");

  let successMsgs = [];
  let errorMsgs = [];

  // Delete region borders data
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

  // Delete weather dates data
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

  // Delete weather data
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
  return res.redirect("/home");
}