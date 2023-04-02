import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { getCollectionFields, getDatatablesData } from "../../utils/database.js";
import { DatabaseEngine } from "../../configs/mongo.js";
import { WeatherMetadata } from "../../types/WeatherMetadata.js";

/**
 * Get metadata page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders metadata index page
 */
export function getMetadataPage(req: Request, res: Response) {
    return res.render("metadata/index.ejs");
}

/**
 * Get create metadata page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders metadata create page
 */
export function getCreateMetadataPage(req: Request, res: Response) {
    return res.render("metadata/create.ejs");
}

/**
 * Get edit weather metadata page
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns Renders metadata edit page
 */
export async function getEditMetadataPage(req: Request, res: Response) {
    function compare(a: any, b: any) {
        if (!a.min || isNaN(a.min)) a.min = 0;
        if (!b.min || isNaN(b.min)) b.min = 0;
        if ( a.min < b.min ){
          return -1;
        }
        if ( a.min > b.min ){
          return 1;
        }
        return 0;
    }
      
    let data: any = [];
    try {
        data = await DatabaseEngine.getWeatherMetadataCollection().findOne({ _id: new ObjectId(req.params.id) });
        if (data.ranges.length) {
            data.ranges.sort(compare);
        }
    } catch (e) {
        console.error(e);
        req.flash("error_message", JSON.stringify(e));
    }
    return res.render("metadata/edit.ejs", { data: data });
}

/**
 * Adds weather metadata document on database
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function createMetadata(req: Request, res: Response) {
    try {
        if (
            !req.body.data.name || 
            req.body.data.name == '' || 
            !req.body.data.description ||
            req.body.data.description == ''
        ) throw "Some fields are missing.";

        const data: WeatherMetadata = { 
            ...req.body.data, 
            authRequired: req.body.data.authRequired === 'true',
            main: req.body.data.main === 'true',
            active: req.body.data.active === 'true',
            ranges: req.body.data.ranges.map((r: any) => { 
                return { 
                    ...r, 
                    max: parseFloat(r.max),
                    min: parseFloat(r.min),
                    alert: r.alert === 'true',
                    recommendations: r.recommendations && r.recomendations != "" ? r.recommendations : []
                }
            })
        };

        if (data.main == true) {
            await DatabaseEngine.getWeatherMetadataCollection().updateMany({}, { $set: { main: false } });
        }

        await DatabaseEngine.getWeatherMetadataCollection().insertOne(data);
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(JSON.stringify(e));
    }
}

/**
 * Gets weather metadata documents
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of metadata objects
 */
export async function getMetadata(req: Request, res: Response) {
    try {
        const collectionName = DatabaseEngine.getWeatherMetadataCollectionName();
        const data = await getDatatablesData(collectionName, {}, req.query);
        return res.json(data);
    } catch (e) {
        console.error(e);
        return res.status(500).json(JSON.stringify(e));
    }
}

/**
 * Gets fields from weather metadata collection
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 * @returns An array of strings containing field names
 */
export async function getMetadataFields(req: Request, res: Response) {
    try {
        const projection = { colours: 0 };
        const find = {};
        const collectionName = DatabaseEngine.getWeatherMetadataCollectionName();
        const fields = await getCollectionFields(collectionName, find, projection);
        return res.json(fields);
    } catch (e) {
        console.error(e);
        return res.status(500).json(JSON.stringify(e));
    }
}

/**
 * Redirects after create/edit weather metadata
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export function metadataRedirect(req: Request, res: Response) {
    try {
        req.flash("success_message", "Weather metadata updated succesfully!");
        return res.redirect("/metadata");
    } catch (e) {
        req.flash("error_message", "An error occurred updating metadata.");
        console.error(e);
        return res.redirect("back");
    }
}

/**
 * Updates a specific weather metadata document
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function updateMetadata(req: Request, res: Response) {
    try {
        if (
            !req.body.data.name || 
            req.body.data.name == '' || 
            !req.body.data.description ||
            req.body.data.description == ''
        ) throw "Some fields are missing.";

        const data: WeatherMetadata = { 
            ...req.body.data, 
            authRequired: req.body.data.authRequired === 'true',
            main: req.body.data.main === 'true',
            active: req.body.data.active === 'true',
            ranges: req.body.data.ranges.map((r: any) => { 
                return { 
                    ...r, 
                    max: parseFloat(r.max),
                    min: parseFloat(r.min),
                    alert: r.alert === 'true',
                    recommendations: r.recommendations && r.recomendations != "" ? r.recommendations : []
                }
            })
        };

        const doc = await DatabaseEngine.getWeatherMetadataCollection().findOne({ _id: new ObjectId(req.params.id) });
        if (data.main == true && doc.main == false) {
            await DatabaseEngine.getWeatherMetadataCollection().updateMany({}, { $set: { main: false } });
        }

        await DatabaseEngine.getWeatherMetadataCollection().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { ...data } });
        return res.json({});
    } catch (e) {
        console.error(e);
        return res.status(500).json(JSON.stringify(e))
    }
}

/**
 * Deletes a specific weather metadata document
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function deleteMetadata(req: Request, res: Response) {
    try {
        await DatabaseEngine.getWeatherMetadataCollection().deleteOne({ _id: new ObjectId(req.params.id) });
        return res.json({});
    } catch(e) {
        console.error(e);
        return res.status(500).json(JSON.stringify(e));
    }
}

/**
 * Deletes all weather metadata documents
 * @param req Client HTTP request object
 * @param res Client HTTP response object
 */
export async function deleteAllMetadata(req: Request, res: Response) {
    try {
        await DatabaseEngine.getWeatherMetadataCollection().deleteMany({});
        req.flash("success_message", "Weather metadata deleted successfully!");
    } catch(e) {
        console.error(e);
        req.flash("error_message", JSON.stringify(e));
    }
    return res.redirect("/metadata");
}