import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import { collectionExistsInDatabase, saveFeatures, getCollectionFields, getDatatablesData, saveCRS, associateCRStoFeatures, queryAllFeatureDocuments } from "../../utils/database.js";
import { FeatureProperties } from "../../types/FeatureProperties";
import { FeatureCollectionWithCRS } from "../../types/FeatureCollectionWithCRS";
import { MultiPolygon, Polygon } from "geojson";

/**
 * Get Regions page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders regions page
 */
export function getRegionsPage(req: Request, res: Response) {
  res.render("regions/index.ejs", { data: [] });
}

/**
 * Get Weather page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders region weather page
 */
export async function getWeatherPage(req: Request, res: Response) {
  try {
    const region = await DatabaseEngine.getFeaturesCollection().findOne({ _id: new ObjectId(req.params.id)})
    if (!region) throw "Region not found";
    return res.render("regions/weather.ejs", { data: region });
  } catch (e) {
    return res.redirect("/regions");
  }
}

/**
 * Get regions
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of regions
 */
export async function handleGetRegions(req: Request, res: Response) {
  try {
    let projection: any = {};
    if (req.query.hasOwnProperty("geometry") && (req.query.geometry == '0' || req.query.geometry == 'false')) {
      projection["geometry"] = 0
    }
    if (req.query.hasOwnProperty("center") && (req.query.center == '0' || req.query.center == 'false')) {
      projection["center"] = 0
    }

    projection["center.type"] = 0;
    projection["type"] = 0;
    const collectionName = DatabaseEngine.getFeaturesCollectionName();
    const data = await getDatatablesData(collectionName, projection, req.query);
    return res.json(data);
  }
  catch (e) {
    console.error(new Date().toJSON(), e);
    return res.status(500).json(JSON.stringify(e));
  }
}

/**
 * Deletes the region borders data from the database
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to home page
 */
export async function handleDeleteRegions(req: Request, res: Response) {
  try {
    await DatabaseEngine.getFeaturesCollection().deleteMany({});
    req.flash("success_message", "Server successfully cleared region borders from the database.");
  } catch (e) {
    console.error(new Date().toJSON(), e)
    if (e && e.codeName === "NamespaceNotFound") {
      req.flash("error_message", "Region borders collection doesn't exist in the database (was probably already deleted).");
    } else if (e) {
      req.flash("error_message", JSON.stringify(e));
    }
  }
  return res.redirect("back");
}

/**
 * Shows the specified region with respective weather data
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An object containing the array of regions and number of records for datatables
 */
export async function handleGetRegionWithWeather(req: Request, res: Response) {
  try {
    const weatherCollection = DatabaseEngine.getWeatherCollection();
    const datesCollectionName = DatabaseEngine.getWeatherDatesCollectionName();
    
    let pipeline:any = [];
    let dateToSearch;
    let columns = [];

    if (req.query.columns) {
      const reqColumns:any = req.query.columns;
      for (const key in reqColumns) {
        columns.push(reqColumns[key]);
      }
      dateToSearch = columns.find(c => c.name == "date").search.value;
    }

    // match region id
    pipeline.push({ $match: { regionBorderFeatureObjectId: new ObjectId(req.params.id) }});

    // aggregate with date
    pipeline.push({ 
      $lookup: {
        from: datesCollectionName,
        localField: 'weatherDateObjectId',
        foreignField: '_id',
        as: 'date',
      }
    });

    const find: any = {};
    if (columns && columns.length) {
      for (const col of columns) {
        if (!col.search.value || col.search.value == '' || col.name == "date") continue;
        if (col.name == "_id" && ObjectId.isValid(col.search.value)) find[col.name] = new ObjectId(col.search.value);
        else find[col.name] = new RegExp(col.search.value, 'i');
      }
    }

    const recordsTotal = (await weatherCollection.aggregate(pipeline).toArray()).length;
    
    pipeline[0].$match = { ...pipeline[0]["$match"], ...find };
    pipeline[1]["$lookup"]["pipeline"] = [
      { "$project": { "_id": 0, "date": { $dateToString: { date: "$date", format: "%Y-%m-%d %H:%M:%S" } } }}
    ];

    if (dateToSearch != '') pipeline.push({ $match: { "date.0.date": new RegExp(dateToSearch, 'i') } });
    const recordsFiltered = (await weatherCollection.aggregate(pipeline).toArray()).length;

    pipeline.push({ $skip: parseInt(req.query.start as string) || 0 });
    pipeline.push({ $limit: parseInt(req.query.length as string) || 0 });
    const data = await weatherCollection.aggregate(pipeline).toArray();
    
    for (const d of data) {
      d.date = d.date[0]?.date;
    }

    data.sort((a,b) => new Date(a.date).valueOf() - new Date(b.date).valueOf());

    return res.json({
      data,
      recordsTotal,
      recordsFiltered,
      draw: req.query.draw
    });

  } catch (e) {
    console.error(new Date().toJSON(), e);
    return res.status(500).json(JSON.stringify(e));
  }
} 

/**
 * Gets region fields
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of strings containing all fields
 */
export async function handleGetRegionFields(req: Request, res: Response) {
  try {
    const projection = { _id: 1, "type": 0, "geometry": 0, "center.type": 0 };
    const find = {};
    const collectionName = DatabaseEngine.getFeaturesCollectionName();
    const fields = await getCollectionFields(collectionName, find, projection);
    return res.json(fields);
  } catch (e) {
    console.error(new Date().toJSON(), e);
    return res.status(500).json(JSON.stringify(e));
  }
}

/**
 * Deletes a specific region from the database
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function handleDeleteRegion(req: Request, res: Response) {
  try {
    const id = req.params.id;
    await DatabaseEngine.getFeaturesCollection().deleteOne({ _id: new ObjectId(id) });
    return res.json({});
  } catch(e) {
    console.error(new Date().toJSON(), e);
    return res.status(500).json(JSON.stringify(e));
  }
}

/**
 * Deletes all weather from specific region
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to previous page
 */
export async function handleDeleteWeatherRegion(req: Request, res: Response) {
  try {
    const id = req.params.id;
    await DatabaseEngine.getWeatherCollection().deleteMany({ regionBorderFeatureObjectId: new ObjectId(id) });
    req.flash("success_message", "Weather data deleted succesfully!");
  } catch(e) {
    console.error(new Date().toJSON(), e);
    req.flash("error_message", "Unable to delete weather data.");
  }
  return res.redirect("back")
}


// TODO: Calculate centers and update them with a single query
/**
 * Calculates the FeatureCenter coordinates of every feature in the region borders collection.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 * @returns Redirects to home page
 */
export async function handleCalculateCenters(req: Request, res: Response) {
  console.log("\nClient requested to calculate the centers for each region border in the collection.");

  //* Check if the region border collection exists
  let regionBordersCollectionName = DatabaseEngine.getFeaturesCollectionName();
  let regionBordersCollectionExists = await collectionExistsInDatabase(
    regionBordersCollectionName,
    DatabaseEngine.getDashboardDatabase()
  );

  //* If the region borders collection doesn't exist, send error response to the client
  if (!regionBordersCollectionExists) {
    req.flash("error_message", "Can't calculate centers because the region borders collection doesn't exist.");
  }

  //* If the region borders collection exists, calculate and update the centers of each feature in the collection
  else {
    //* Query the region borders collection for the various features
    // The query results are going to be used by server to calculate the FeatureCenter of each and all features (geometry field), and save it to the corresponding feature (using the id).
    // As such, the properties don't need to be returned, and the FeatureCenter coordinates of each region don't need to be returned (because they shouldn't exist yet).
    //let featuresQuery: Filter<Document> = { center: { $exists: false } };
    let featuresQueryProjection = {
      _id: 1,
      properties: 0,
      center: 0,
      crsObjectId: 0,
    };


    let featuresQueryResults = await queryAllFeatureDocuments(
      featuresQueryProjection
    );

    for (const feature of featuresQueryResults) {
      let center = polygonCenter(feature.geometry);

      // Add the centre data to the feature in the database
      await DatabaseEngine.getFeaturesCollection().updateOne(
        {_id: feature._id}, // Updates the region feature document that has the same id as the current feature
        {
          $set: {
            center: center,
          },
        }
      );
  }


    let message = "";
    message += "Calculated the center coordinates for every feature in the region borders collection.";
    console.log(message);

    req.flash("success_message", message);
  }

  console.log("Server finished calculating the centers for each region border in the collection.\n");
  return res.redirect("/home");
}

// TODO: Important. User saves empty geoJSON. Crashes program.
/**
 * Save a geoJSON information to the database.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 * @returns Redirects to previous page
 */
export async function handleSaveRegions(req: Request, res: Response) {
  console.log("Received geoJSON from the client.");
  try {
    //* Parse received file bytes to geoJSON
    let fileBuffer = req.file.buffer; // Multer enables the server to access the file sent by the client using "request.file.buffer". The file accessed is in bytes.
    let trimmedFileBuffer = fileBuffer.toString().trimStart().trimEnd(); // Sometimes the geoJSON sent has unnecessary spaces that need to be trimmed
    let geoJSON: FeatureCollectionWithCRS<MultiPolygon | Polygon, FeatureProperties> = JSON.parse(trimmedFileBuffer); // Parse the trimmed file buffer to a correct geoJSON

    //* Save geoJSON coordinate reference system to the collection, if it doesn't already exist
    let insertedCRSObjectId;

    try {
      console.log(
          "Started inserting geoJSON coordinate reference system in the database."
      );
      insertedCRSObjectId = await saveCRS(geoJSON);
      console.log(
          "Inserted geoJSON coordinate reference system in the database. CRS ID in database:",
          // To extract the ID string inside the ObjectId, we use ObjectId.toHexString
          insertedCRSObjectId.toHexString() // The ID string of the CRS document that was inserted in the database
      );
    } catch (e) {
      console.error(new Date().toJSON(), e);
      req.flash("error_message", "Unable to upload file. No CRS info found in file.");
      return res.redirect("back");
    }
    
    //* Save each geoJSON feature to the collection individually
    console.log("Started inserting geoJSON features in the database.");
    let insertedFeaturesObjectIds = await saveFeatures(geoJSON);
    console.log("Inserted geoJSON features in the database.");

     //* Create a field with on each feature with its associated coordinates reference system
     console.log("Starting associating each feature with its CRS.");
     await associateCRStoFeatures(insertedCRSObjectId, insertedFeaturesObjectIds);
     console.log("Finished associating each feature with its CRS.\n");

    // Send successful response to the client
    req.flash("success_message", "Server successfully saved geoJSON.");
    return res.redirect("back");
  } catch (e) {
    req.flash("error_message", "Unable to upload file.");
    return res.redirect("back");
  }
}