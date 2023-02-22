import {DatabaseEngine} from "../../configs/mongo.js";
import sendResponseWithGoBackLink from "../../utils/response.js";
import {collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments, saveFeatures, getCollectionFields,} from "../../utils/database.js";
// @ts-ignore
import polygonCenter from "geojson-polygon-center";
import {Request, Response} from "express-serve-static-core";
import {FeaturesProjection} from "../../types/DatabaseCollections/Projections/FeaturesProjection";
import {Document, Filter, ObjectId, WithId} from "mongodb";
import {FeatureCollectionWithCRS} from "../../types/FeatureCollectionWithCRS";
import {Feature, FeatureCollection, MultiPolygon, Polygon} from "geojson";
import {FeatureProperties} from "../../types/FeatureProperties";
import async from "async";

/**
 * Sends a response with an array of geoJSONs. <p>
 * Each element of the array is a geoJSON with a different coordinates reference system found in the database. <p>
 * Each element of the array consists of a CRS and the region borders projected using that CRS.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleGetRegionBorders(request: Request, response: Response) {
    console.log(new Date().toJSON(), "\nClient requested region borders.");

    //* Check if the region border collection exists
    const regionBordersCollectionExists = await collectionExistsInDatabase(
        DatabaseEngine.getFeaturesCollectionName(),
        DatabaseEngine.getDashboardDatabase()
    );

    //* If the region borders collection doesn't exist, send error response to the client
    if (!regionBordersCollectionExists) {
        return response.status(404).json("Couldn't get region borders because the collection doesn't exist.");
    }

    //* If the region borders collection exists, send the various saved geoJSONs to the client
    let projection: any = {};
    if (request.query.hasOwnProperty("geometry") && (request.query.geometry == '0' || request.query.geometry == 'false')) {
        projection["feature.geometry"] = 0
    }
    if (request.query.hasOwnProperty("center") && (request.query.center == '0' || request.query.center == 'false')) {
        projection["feature.center"] = 0
    }

    let recordsTotal = 0;
    let recordsFiltered = 0;
    let regionBordersDocumentsArray = [];
    if (request.query.id) {
        const find = {
            _id: new ObjectId(request.query.id as string)
        }
        regionBordersDocumentsArray = await queryFeatureDocuments(find, projection);
    }
   /*  else if (request.query.dt && request.query.columns) {
        projection["center.type"] = 0;
        projection["feature.type"] = 0;

        const find:any = {};
        for (const col of request.query.columns as any[]) {
            if (!col.search.value || col.search.value == '') continue;
            if (col.name == "_id" && ObjectId.isValid(col.search.value)) find[col.name] = new ObjectId(col.search.value);
            else find[col.name] = new RegExp(col.search.value, 'i');
        }

        let skip = parseInt(request.query.start as string) || 0;
        let limit = parseInt(request.query.length as string) || 0;

        recordsTotal = await DatabaseEngine.getFeaturesCollection().countDocuments();
        recordsFiltered = (await queryFeatureDocuments(find, projection)).length;

        regionBordersDocumentsArray = await queryFeatureDocuments(find, projection, skip, limit);
    } */
    else {
        regionBordersDocumentsArray = await queryAllFeatureDocuments(projection);
    }


    let geoJSON:any = {
        type: "FeatureCollection",
        features: regionBordersDocumentsArray //queriedFeatures
    }

   /*  if (request.query.dt) {
        geoJSON = { 
            data: regionBordersDocumentsArray, //queriedFeatures
            draw: request.query.draw, 
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered
        }
    }  */

    return response.json(geoJSON);
}






