import fetch from "cross-fetch";
import { DatabaseEngine } from "../configs/mongo.js";
import { FeatureWeather } from "../models/FeatureProperties";
import csv from "csvtojson";
import { FeaturesProjection } from "../models/DatabaseCollections/Projections/FeaturesProjection.js";
import fs from "fs";
import glob from 'glob';

const KEEP_DATA_PREVIOUS_DAYS = parseInt(process.env.KEEP_DATA_PREVIOUS_DAYS) || 2;
const CSV_FOLDER_PATH = process.env.CSV_FOLDER_PATH_DOCKER || process.env.CSV_FOLDER_PATH_LOCAL;

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
 * @returns void
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
        if (!CSV_FOLDER_PATH || CSV_FOLDER_PATH == "" || !fs.existsSync(CSV_FOLDER_PATH)) { 
            throw "ERROR in CSV Folder: Path not specified or does not exist.";
        }

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

        console.log("JOB: Inserted weather data.")
        /*
        let data = await csv({ignoreColumns: /^\s*$/}).fromFile(CSV_FILE_PATH);
        data = await transformData(data);
        const weatherCollection = DatabaseEngine.getWeatherCollection();
        await weatherCollection.insertMany(data); */
    } catch (e) {
        console.error(e);
    } finally {
        return;
    }
}

/**
 * Function that transforms raw data
 * @param data Array containing the raw weather data to be transformed.
 * @returns The transformed data to insert into database.
 */
export async function transformData(data: any[]) {
    if (!data.length) return [];

    const transformedData: any[] = [];
    const regex = "(\d{4}|[0-9]{2})(-|\/)([0-9]{2})(-|\/)([0-9]{4}|[0-9]{2})";
    const dates: string[] = [];
    const fieldsWithoutDate: string[] = [];
    const fieldsWithDate: string[] = [];
    
    // Get fields with date and fields without date
    (Object.keys(data[0])).forEach(field => {
        const matchArr = field.match(regex);
        if (matchArr) {
            fieldsWithDate.push(field);
            const date = matchArr[0]//.replace(/\//g, "-");
            if (!dates.includes(date)) dates.push(date);
        }
        else fieldsWithoutDate.push(field);
    })

    // Insert dates in DB
    const bulkOps = dates.map(d => {
        const reverseDate = d.split("-").reverse().join("-"); 
        const dateToInsert = new Date(reverseDate);
        return { updateOne: 
            {
                filter: { "date": dateToInsert }, 
                update: { $setOnInsert: { "date": dateToInsert } }, 
                upsert: true 
            }
        }
    });
    const datesCollection = DatabaseEngine.getWeatherDatesCollection();
    await datesCollection.bulkWrite(bulkOps);
    const datesFromDB = await datesCollection.find({}).toArray();

    // Loop through CSV data and create samples
    const regionsCollection = DatabaseEngine.getFeaturesCollection();
    for (const row of data) {
        const projection: FeaturesProjection = { _id: 1 };
        const regions = await regionsCollection.find(
                { "feature.properties.Concelho": row.county },
                { projection }
            )
            .collation({ locale: "pt", strength: 1 })
            .toArray();
        
        if (!regions.length) continue;

        for (const date of dates) {
            const fields = [...fieldsWithoutDate, ...fieldsWithDate.filter(f => f.includes(date))];
            const reverseDate = date.split("-").reverse().join("-"); 
            const dateObj = datesFromDB.find(d => new Date(d.date).valueOf() === new Date(reverseDate).valueOf());

            const sample: any = { weather: {} };
            for (const field of fields) {
                sample.weather[field.replace(date,"").replace(/^\_+|\_+$/g, '')] = row[field];
            }
            sample.regionBorderFeatureObjectId = regions[0]?._id || null;
            sample.weatherDateObjectId = dateObj?._id || null;

            transformedData.push(sample);
        }
    }

    return transformedData;
}