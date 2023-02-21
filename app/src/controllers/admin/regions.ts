import { DatabaseEngine } from "../../configs/mongo";
import { Request, Response } from "express-serve-static-core";
import { Filter, ObjectId } from "mongodb";
import async from "async";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import { collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments, saveFeatures, getCollectionFields } from "../../utils/database.js";
import { FeatureProperties } from "../../models/FeatureProperties";
import { FeatureCollectionWithCRS } from "../../models/FeatureCollectionWithCRS";
import { MultiPolygon, Polygon } from "geojson";

/**
 * Get Regions page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export function getRegionsPage (req: Request, res: Response) {
  res.render("regions.ejs", { data: [] });
}

/**
 * Deletes the region borders data from the database
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteRegions(req: Request, res: Response) {
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
 * Shows the specified region with respective weather data
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleGetRegionWithWeather(req: Request, res: Response) {
  let data: any = [];
  try {
    const weatherCollection = DatabaseEngine.getWeatherCollection();
    const datesCollectionName = DatabaseEngine.getWeatherDatesCollectionName();
    let pipeline = [];

    // match region id
    pipeline.push({ match: { regionBorderFeatureObjectId: new ObjectId(req.params.id) }});

    // aggregate with date
    pipeline.push({ 
      $lookup: {
        from: datesCollectionName,
        localField: '_id',
        foreignField: '_id',
        as: 'date',
      }
    });

    data = await weatherCollection.aggregate(pipeline).toArray();
  } catch (e) {
    req.flash("error_message", JSON.stringify(e));
  }

  return res.render("/admin/weather.ejs", { data: data });
} 

/**
 * Gets region fields
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleGetRegionFields(request: Request, response: Response) {
  try {
      const projection = { _id: 1, "feature.type": 0, "feature.geometry": 0, "center.type": 0 };
      const find = {};
      const collectionName = DatabaseEngine.getFeaturesCollectionName();
      const fields = await getCollectionFields(collectionName, find, projection);
      return response.json(fields);
  } catch (e) {
      return response.status(500).json(e);
  }
}

/**
 * Deletes a specific region from the database
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteRegion(request: Request, response: Response) {
  try {
      const id = request.params.id;
      await DatabaseEngine.getFeaturesCollection().deleteOne({ _id: new ObjectId(id) });
      return response.json({});
  } catch(e) {
      console.error(e);
      return response.status(500).json(e);
  }
}

// TODO: Calculate centers and update them with a single query
/**
 * Calculates the FeatureCenter coordinates of every feature in the region borders collection.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleCalculateCenters(request: Request, response: Response) {
  console.log("\nClient requested to calculate the centers for each region border in the collection.");

  //* Check if the region border collection exists
  let regionBordersCollectionName = DatabaseEngine.getFeaturesCollectionName();
  let regionBordersCollectionExists = await collectionExistsInDatabase(
      regionBordersCollectionName,
      DatabaseEngine.getDashboardDatabase()
  );

  //* If the region borders collection doesn't exist, send error response to the client
  if (!regionBordersCollectionExists) {
      request.flash("error", "Can't calculate centers because the region borders collection doesn't exist.");
  }

  //* If the region borders collection exists, calculate and update the centers of each feature in the collection
  else {

      //* Query the region borders collection for the various features
      // The query results are going to be used by server to calculate the FeatureCenter of each and all features (geometry field), and save it to the corresponding feature (using the id).
      // As such, the properties don't need to be returned, and the FeatureCenter coordinates of each region don't need to be returned (because they shouldn't exist yet).
      let featuresQuery: Filter<Document> = {center: {$exists: false}};
      let featuresQueryProjection = {
          _id: 1,
          properties: 0,
          center: 0,
          crsObjectId: 0,
      };
      let featureDocuments = await queryFeatureDocuments(
          featuresQuery,
          featuresQueryProjection
      );

      let currentFeatureIndex = 1;
      await async.each(featureDocuments, async (currentFeature) => {
          if ((currentFeatureIndex % 10) === 0) {
              console.log("Calculating center of feature number: " + currentFeatureIndex)
          }

          const center = polygonCenter(currentFeature.feature.geometry);

          // Add the centre data to the regionBorderDocument in the database
          await DatabaseEngine.getFeaturesCollection().updateOne(
            { _id: currentFeature._id }, 
            {
              $set: {
                center: center,
              },
            }
          );

          currentFeatureIndex++;
      })

      let message = "";
      message += "Calculated the center coordinates for every feature in the region borders collection.";
      console.log(message);

      request.flash("success_message", message);
  }

  console.log("Server finished calculating the centers for each region border in the collection.\n");
  return response.redirect("/admin");
}

// TODO: Important. User saves empty geoJSON. Crashes program.
/**
 * Save a geoJSON information to the database.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleSaveRegions(request: Request, response: Response) {
  console.log("Received geoJSON from the client.");
  try {
    //* Parse received file bytes to geoJSON
    let fileBuffer = request.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
    let trimmedFileBuffer = fileBuffer.toString().trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
    let geoJSON: FeatureCollectionWithCRS<MultiPolygon | Polygon, FeatureProperties> = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

    //* Save each geoJSON feature to the collection individually
    console.log("Started inserting geoJSON features in the database.");
    await saveFeatures(geoJSON);
    console.log("Inserted geoJSON features in the database.");

    // Send successful response to the client
    request.flash("success_message", "Server successfully saved geoJSON.");
    return response.redirect("back");
  } catch (e) {
    request.flash("error_message", "Não foi possível carregar o ficheiro.");
    return response.redirect("back");
  }
}