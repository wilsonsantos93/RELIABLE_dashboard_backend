import { DatabaseEngine } from "../../configs/mongo.js";
import { Request, Response } from "express-serve-static-core";
import { Filter, ObjectId, Document } from "mongodb";
import async from "async";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import { collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments, saveFeatures, getCollectionFields, getDatatablesData } from "../../utils/database.js";
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
  const region = await DatabaseEngine.getFeaturesCollection().findOne({ _id: new ObjectId(req.params.id)})
  return res.render("regions/weather.ejs", { data: region });
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
      projection["feature.geometry"] = 0
    }
    if (req.query.hasOwnProperty("center") && (req.query.center == '0' || req.query.center == 'false')) {
      projection["feature.center"] = 0
    }

    projection["center.type"] = 0;
    projection["feature.type"] = 0;
    const collectionName = DatabaseEngine.getFeaturesCollectionName();
    const data = await getDatatablesData(collectionName, projection, req.query);
    return res.json(data);
  }
  catch (e) {
    console.error(e);
    return res.status(500).json(e);
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
    console.error(e)
    if (e && e.codeName === "NamespaceNotFound") {
      req.flash("error_message", "Region borders collection doesn't exist in the database (was probably already deleted).");
    } else if (e) {
      req.flash("error_message", JSON.stringify(e));
    }
  }
  return res.redirect("/home");
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
    console.error(e);
    return res.status(500).json(e);
  }
} 

/**
 * Gets region fields
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of strings containing all fields
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

/**
 * Deletes all weather from specific region
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Redirects to previous page
 */
export async function handleDeleteWeatherRegion(request: Request, response: Response) {
  try {
    const id = request.params.id;
    await DatabaseEngine.getWeatherCollection().deleteMany({ regionBorderFeatureObjectId: new ObjectId(id) });
    request.flash("success_message", "Dados eliminados com sucesso.");
  } catch(e) {
    console.error(e);
    request.flash("error_message", "Não foi possível eliminar os dados.");
  }
  return response.redirect("back")
}


// TODO: Calculate centers and update them with a single query
/**
 * Calculates the FeatureCenter coordinates of every feature in the region borders collection.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 * @returns Redirects to home page
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
      request.flash("error_message", "Can't calculate centers because the region borders collection doesn't exist.");
  }

  //* If the region borders collection exists, calculate and update the centers of each feature in the collection
  else {
    //* Query the region borders collection for the various features
    // The query results are going to be used by server to calculate the FeatureCenter of each and all features (geometry field), and save it to the corresponding feature (using the id).
    // As such, the properties don't need to be returned, and the FeatureCenter coordinates of each region don't need to be returned (because they shouldn't exist yet).
    let featuresQuery: Filter<Document> = { center: { $exists: false } };
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
  return response.redirect("/home");
}

// TODO: Important. User saves empty geoJSON. Crashes program.
/**
 * Save a geoJSON information to the database.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 * @returns Redirects to previous page
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