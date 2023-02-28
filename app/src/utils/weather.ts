import fetch from "cross-fetch";
import { DatabaseEngine } from "../configs/mongo.js";
import { FeatureWeather } from "../types/FeatureProperties";
import csv from "csvtojson";
import { FeaturesProjection } from "../types/DatabaseCollections/Projections/FeaturesProjection.js";
import fs from "fs";
import glob from 'glob';
import { allReplacements } from "./database.js";

const KEEP_DATA_PREVIOUS_DAYS = parseInt(process.env.KEEP_DATA_PREVIOUS_DAYS) || 2;
const CSV_FOLDER_PATH_DOCKER = process.env.CSV_FOLDER_PATH_DOCKER || null;
const CSV_FOLDER_PATH_LOCAL = process.env.CSV_FOLDER_PATH_LOCAL || null;
const DATABASE_FIELD_TO_MATCH = "properties.Concelho";
const WEATHER_FIELD_TO_MATCH = "county";

/**
 * Fetch the weather of a location from an external API, and return it.
 * @param locationCoordinates The array of the location to fetch the weather.
 * @return weatherDataJSON A JSON with the weather information of a location.
 */
export async function requestWeather(locationCoordinates: number[]): Promise<FeatureWeather> {

    const apiURL =
        "https://api.weatherapi.com/v1/current.json?key=a1f415612c9543ea80a151844220103&q=" +
        locationCoordinates +
        "&aqi=yes";

    const fetchSettings = {method: "Get"};
    const response = await fetch(apiURL, fetchSettings);
    const weatherDataJSON = await response.json();

    return weatherDataJSON;
}

/**
 * Function that deletes previous data from weather and dates.
 */
export async function handleDeleteWeatherAndDates() {
    try {
        const datesCollection = await DatabaseEngine.getWeatherDatesCollection();
        const date = new Date(new Date().valueOf() - KEEP_DATA_PREVIOUS_DAYS*24*60*60*1000);
        const ids = await (await datesCollection.find({ "date": { $lt: date } }).toArray()).map((doc) => doc._id);

        if (!ids.length) return
        
        const weatherCollection = await DatabaseEngine.getWeatherCollection();
        await weatherCollection.deleteMany({ "weatherDateObjectId": { $in: ids } });
        await datesCollection.deleteMany({ "_id": { $in: ids } });

        console.log("JOB: Deleted previous weather and dates.");
    } catch (e) {
        console.error(e);
    } finally {
        return;
    } 
}

// Function to generate array of update operations
/**
 * 
 * @param data An array of raw weather data.
 * @returns An array of updateOne operations.
 */
export function createBulkOps(data: any[]) {
    return data.map(d => {
        return { updateOne: 
            {
                filter: { "weatherDateObjectId": d.weatherDateObjectId, "regionBorderFeatureObjectId": d.regionBorderFeatureObjectId }, 
                update: { $set: d }, 
                upsert: true 
            }
        }
    });
}

/**
 * Function that reads CSV file containing weather data and inserts data into Weather collection.
 * @returns void
 */
export async function readWeatherFile() {
    try {
        const totalRegions = await DatabaseEngine.getFeaturesCollection().estimatedDocumentCount();
        if (!totalRegions) return;

        /* if (!CSV_FOLDER_PATH || CSV_FOLDER_PATH == "" || !fs.existsSync(CSV_FOLDER_PATH)) { 
            throw "ERROR in CSV Folder: Path not specified or does not exist.";
        } */

        let CSV_FOLDER_PATH = null;
        if (!CSV_FOLDER_PATH_DOCKER || CSV_FOLDER_PATH_DOCKER == "" || !fs.existsSync(CSV_FOLDER_PATH_DOCKER)) {
            if (!CSV_FOLDER_PATH_LOCAL || CSV_FOLDER_PATH_LOCAL == "" || !fs.existsSync(CSV_FOLDER_PATH_LOCAL)) {
                throw "ERROR in CSV Folder: Path not specified or does not exist.";
            }
            CSV_FOLDER_PATH = CSV_FOLDER_PATH_LOCAL;
        } 
        else CSV_FOLDER_PATH = CSV_FOLDER_PATH_DOCKER;


        const newestFile = glob.sync(`${CSV_FOLDER_PATH}/*.csv`)
            .map((name: any) => ({name, ctime: fs.statSync(name).ctime}))
            .sort((a: any, b: any) => b.ctime - a.ctime)[0]?.name;

        console.log("JOB: Reading CSV file:", newestFile);

        const weatherCollection = DatabaseEngine.getWeatherCollection();
        const readStream = fs.createReadStream(newestFile);
        
        let i = 0;
        let data: any[] = [];
        await csv({ignoreColumns: /^\s*$/}).fromStream(readStream).subscribe((json) => {
            i++;
            return new Promise( async (resolve, reject) => {
                data.push(json);
                // At every N rows insert into DB
                if (i % 300 == 0) {
                    await weatherCollection.bulkWrite(createBulkOps(await transformData(data)));
                    data = [];
                }
                return resolve();
            })
        });

        // If there is some data still to insert
        if (data.length) {
            await weatherCollection.bulkWrite(createBulkOps(await transformData(data)));
            data = [];
        }

        console.log("JOB: Inserted weather data.");
    } catch (e) {
        console.error(e);
    } finally {
        return;
    }
}

/**
 * Function that extracts the date from a string
 * @param str The string that may contain a date
 * @param regex (optional) The regular expression to match
 * @returns The regular expression match array
 */
function extractDateFromString(str: string, regex: string | RegExp = null) {
    if (!regex) regex = new RegExp("[0-9]{2,4}(-|/)[0-9]{2}(-|/)[0-9]{2,4}(( |_|T)[0-9]{0,2}(:||_)[0-9]{0,2}(:||_)[0-9]{0,2}(\.[0-9]{0,3})?){0,1}");

    const match = str.match(regex);

    if (!match) return null;

    return match;
}

/**
 * Function that extracts the date from a string and formats it
 * @param data Array containing the raw weather data to be transformed.
 * @param regex (optional) The regular expression to match
 * @returns The formatted date to insert into database.
 */
function extractAndFormatDateFromString(str: string, regex: string | RegExp = null) {
    const match = extractDateFromString(str);

    if (!match) return null;

    const date = match[0].split(match[3])[0];
    let day = date.split(match[1])[0];
    const month = date.split(match[2])[1];
    let year = date.split(match[2])[2];
    let time = match[0].split(match[4])[1];

    if (time && !time.includes(":")) {
        if (time.length == 4) time = time.slice(0,2)+':'+time.slice(2);
        if (time.length == 3) time = time.slice(0,1)+':'+time.slice(1);
    }
    if (day.length == 4) {
        let aux = day;
        day = year;
        year = aux;
    }

    return `${year}-${month}-${day}${time ? ' '+time : ''}`;
}


/**
 * Function that transforms raw data
 * @param data Array containing the raw weather data to be transformed.
 * @returns The transformed data to insert into database.
 */
export async function transformData(data: any[]) {
    const transformedData: any = [];
    const formattedDates: any = [];
    const originalDates: any = [];
    const fieldsNotDate: string[] = [];
    const regionsCollection = DatabaseEngine.getFeaturesCollection();
    const datesCollection = DatabaseEngine.getWeatherDatesCollection();

    // Loop through data 
    for (const d of data) {
        if (!d.hasOwnProperty(WEATHER_FIELD_TO_MATCH)) continue;
        const regionPossibleNames = allReplacements(d[WEATHER_FIELD_TO_MATCH], "-", " ");
        const projection: FeaturesProjection = { _id: 1 };
        const regions = await regionsCollection.find(
            { [DATABASE_FIELD_TO_MATCH]: { $in: regionPossibleNames } },
            { projection }
        )
        .collation({ locale: "pt", strength: 1 })
        .toArray();
        
        if (!regions.length) continue;
        
        // Loop through fields
        for (const key in d) {
            const match = extractDateFromString(key);
            const originalDate = match && match.length ? match[0] : null;
            if (originalDate && !originalDates.includes(originalDate)) originalDates.push(originalDate);
            if (!originalDate) fieldsNotDate.push(key);
        }

        if (!originalDates.length) return [];

        // Insert dates into DB
        const bulkOps = originalDates.map((date: string) => {
            const dateToInsert = new Date(extractAndFormatDateFromString(date));
            formattedDates.push(dateToInsert);
            return { updateOne: 
                {
                    filter: { "date": dateToInsert }, 
                    update: { $setOnInsert: { "date": dateToInsert } }, 
                    upsert: true 
                }
            }
        });
        await datesCollection.bulkWrite(bulkOps);
        const datesFromDB = await datesCollection.find({ date: { $in: formattedDates }}).toArray();

        // build sample for each date
        for (const date of originalDates) {
            let sample: any = {};

            // Add fields with this date to the sample
            const fields = Object.keys(d).filter(f => f.includes(date));
            if (!fields || !fields.length) continue;

            sample.weather = {};
            fields.forEach(f => {
                sample.weather[f.replace(date,"").replace(/^\_+|\_+$/g, '')] = parseFloat(d[f]) || d[f];
            });

            // Add fields not having any date to the sample
            fieldsNotDate.forEach(f => {
                sample.weather[f] = parseFloat(d[f]) || d[f];
            });

            // Add dateId
            sample.weatherDateObjectId = datesFromDB.find(doc => new Date(doc.date).valueOf() == new Date(extractAndFormatDateFromString(date)).valueOf())?._id;

            // Add region id and push to array
            for (const region of regions) {
                // Add region Id
                sample.regionBorderFeatureObjectId = region?._id || null;

                // Push sample to array
                if (Object.keys(sample).length > 0) transformedData.push(sample);
            }  
        }
    }

    return transformedData;
}