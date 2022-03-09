import sendResponseWithGoBackLink from "../utils/response.js";
import { DatabaseEngine } from "../configs/mongo.js";
import newlineBr from "newline-br";

//* Client requests to delete all collections
export async function handleDeleteAll(request, response) {
  console.log("Client requested to drop the all collections.");

  let message = "";

  // Drop CRS collection
  try {
    await DatabaseEngine.getCRScollection().drop();
    message += "Server successfully deleted CRSs from the database.\n";
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      message +=
        "CRSs collection doesn't exist in the database (was probably already deleted).\n";
    } else if (dropError) {
      message += dropError;
    }
  }

  // Drop region borders collection
  try {
    await DatabaseEngine.getRegionBordersCollection().drop();

    message +=
      "Server successfully deleted region borders from the database.\n";
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      message +=
        "Region borders collection doesn't exist in the database (was probably already deleted).\n";
    } else if (dropError) {
      message += dropError;
    }
  }

  // Drop weather dates collection
  try {
    await DatabaseEngine.getWeatherDatesCollection().drop();
    message +=
      "Server successfully deleted weather saved dates from the database.\n";
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      message +=
        "Weather saved dates collection doesn't exist in the database (was probably already deleted).\n";
    } else if (dropError) {
      message += dropError;
    }
  }
  // Drop weather information collection
  try {
    await DatabaseEngine.getWeatherCollection().drop();
    message +=
      "Server successfully deleted weather information from the database.";
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      message +=
        "Weather information collection doesn't exist in the database (was probably already deleted).";
    } else if (dropError) {
      message += dropError;
    }
  }

  console.log(message);
  console.log("");
  sendResponseWithGoBackLink(response, newlineBr(message));
}

//* Client requests the CRSs collection to be deleted
export async function handleDeleteCRSs(request, response) {
  console.log("Client requested to drop the CRSs collection.");

  // Drop collection and send response to the server
  try {
    await DatabaseEngine.getCRScollection().drop();
    let message = "Server successfully deleted CRSs from the database.";
    console.log(message);
    console.log("");

    // Send successful response to the client
    sendResponseWithGoBackLink(response, message);
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      let message =
        "CRSs collection doesn't exist in the database (was probably already deleted).";
      console.log(message);
      console.log("\n");
      sendResponseWithGoBackLink(response, message);
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
    }
  }
}

//* Deletes the region borders collection from the databaseResponse
export async function handleDeleteRegionBorders(request, response) {
  console.log("Client requested to drop the region borders collection.");

  // Drop collection and send response to the server
  try {
    await DatabaseEngine.getRegionBordersCollection().drop();

    let message =
      "Server successfully deleted region borders from the database.";

    console.log(message);
    console.log();

    // Send successful response to the client
    sendResponseWithGoBackLink(response, message);
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      let message =
        "Region borders collection doesn't exist in the database (was probably already deleted).";
      console.log(message);
      console.log("\n");
      sendResponseWithGoBackLink(response, message);
    } else if (dropError) {
      console.log(dropError);
      sendResponseWithGoBackLink(response, dropError);
    }
  }
}

//* Client requests the weatherDates collection to be deleted
export async function handleDeleteWeatherDates(request, response) {
  console.log("Client requested to drop the weather saved dates collection.");

  // Drop collection and send response to the server
  try {
    await DatabaseEngine.getWeatherDatesCollection().drop();
    let message =
      "Server successfully deleted weather saved dates from the database.";
    console.log(message);
    console.log();

    // Send successful response to the client
    sendResponseWithGoBackLink(response, message);
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      let message =
        "Weather saved dates collection doesn't exist in the database (was probably already deleted).";
      console.log(message);
      console.log("\n");
      sendResponseWithGoBackLink(response, message);
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
    }
  }
}

//* Client requests the weather collection to be deleted
export async function handleDeleteWeather(request, response) {
  console.log("Client requested to drop the weather information collection.");

  // Drop colletion and send response to the server
  try {
    await DatabaseEngine.getWeatherCollection().drop();
    let message =
      "Server successfully deleted weather information from the database.";
    console.log(message);
    console.log();

    // Send successful response to the client
    sendResponseWithGoBackLink(response, message);
  } catch (dropError) {
    if (dropError && dropError.codeName == "NamespaceNotFound") {
      let message =
        "Weather information collection doesn't exist in the database (was probably already deleted).";
      console.log(message);
      console.log("\n");
      sendResponseWithGoBackLink(response, message);
    } else if (dropError) {
      console.log(dropError);
      response.send(dropError);
    }
  }
}
