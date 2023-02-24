import { DatabaseEngine } from "../../configs/mongo.js";
import { collectionExistsInDatabase, queryFeatureDocuments, queryAllFeatureDocuments } from "../../utils/database.js";
// @ts-ignore
import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";


/**
 * Sends a response with an array of geoJSONs. <p>
 * Each element of the array is a geoJSON with a different coordinates reference system found in the database. <p>
 * Each element of the array consists of a CRS and the region borders projected using that CRS.
 * @param request Client HTTP request object
 * @param response Client HTTP response object
 * @returns An array of geoJson documents
 */
export async function handleGetRegionBorders(req: Request, res: Response) {
    try {
        console.log(new Date().toJSON(), "\nClient requested region borders.");

        //* Check if the region border collection exists
        const regionBordersCollectionExists = await collectionExistsInDatabase(
            DatabaseEngine.getFeaturesCollectionName(),
            DatabaseEngine.getDashboardDatabase()
        );

        //* If the region borders collection doesn't exist, send error response to the client
        if (!regionBordersCollectionExists) {
            return res.status(404).json("Couldn't get region borders because the collection doesn't exist.");
        }

        //* If the region borders collection exists, send the various saved geoJSONs to the client
        let projection: any = {};
        if (req.query.hasOwnProperty("geometry") && (req.query.geometry == '0' || req.query.geometry == 'false')) {
            projection["feature.geometry"] = 0
        }
        if (req.query.hasOwnProperty("center") && (req.query.center == '0' || req.query.center == 'false')) {
            projection["center"] = 0
        }

        let regionBordersDocumentsArray = [];
        if (req.params.id) {
            const find = {
                _id: new ObjectId(req.params.id as string)
            }
            regionBordersDocumentsArray = await queryFeatureDocuments(find, projection);
        }
        else {
            regionBordersDocumentsArray = await queryAllFeatureDocuments(projection);
        }


        const geoJSON = {
            type: "FeatureCollection",
            features: regionBordersDocumentsArray
        }

        return res.json(geoJSON);
    } catch (e) {
        console.error(e);
        return res.status(500).json("Error getting regions");
    }
}