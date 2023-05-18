import fetch from "cross-fetch";
import { DatabaseEngine } from "../configs/mongo.js";
import { FeatureWeather } from "../types/FeatureProperties";
import csv from "csvtojson";
import { FeaturesProjection } from "../types/DatabaseCollections/Projections/FeaturesProjection.js";
import fs from "fs";
import glob from 'glob';
import { allReplacements, getObjectValue } from "./database.js";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { readGeneralMetadata } from "./metadata.js";
import path from "path";
import nodemailer from "nodemailer";
import { Role } from "../types/User.js";
import { decrypt } from "./encrypt.js";
dayjs.extend(utc);
dayjs.extend(timezone);

const tz = "Europe/Lisbon";

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
        const data = await readGeneralMetadata();
        const KEEP_DATA_PREVIOUS_DAYS = data.KEEP_DATA_PREVIOUS_DAYS ? parseInt(data.KEEP_DATA_PREVIOUS_DAYS) : 1;
        const datesCollection = await DatabaseEngine.getWeatherDatesCollection();
        const date = new Date(new Date().valueOf() - KEEP_DATA_PREVIOUS_DAYS*24*60*60*1000);
        const ids = await (await datesCollection.find({ "date": { $lt: date } }).toArray()).map((doc) => doc._id);

        if (!ids.length) return
        
        const weatherCollection = await DatabaseEngine.getWeatherCollection();
        await weatherCollection.deleteMany({ "weatherDateObjectId": { $in: ids } });
        await datesCollection.deleteMany({ "_id": { $in: ids } });

        console.log("JOB: Deleted previous weather and dates.");
    } catch (e) {
        console.error(new Date().toJSON(), e);
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
                filter: { 
                    "weatherDateObjectId": d.weatherDateObjectId, 
                    "regionBorderFeatureObjectId": d.regionBorderFeatureObjectId 
                }, 
                update: { $set: { ...d } }, 
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

        const { CSV_FOLDER_PATH_LOCAL, CSV_FOLDER_PATH_DOCKER } = await readGeneralMetadata();

        let CSV_FOLDER_PATH = CSV_FOLDER_PATH_DOCKER || CSV_FOLDER_PATH_LOCAL || null;
        if (!CSV_FOLDER_PATH) throw "ERROR in CSV Folder: Path not specified or does not exist.";

        const csvpath = path.join(CSV_FOLDER_PATH, "*.csv");
        
        //const newestFile = glob.sync(`${CSV_FOLDER_PATH}/*.csv`)
        const newestFile = glob.sync(csvpath)
            .map((name: any) => ({name, ctime: fs.statSync(name).ctime}))
            .sort((a: any, b: any) => b.ctime - a.ctime)[0]?.name;

        if (!newestFile) throw "No CSV file found.";

        console.log("JOB: Reading CSV file:", newestFile);

        const weatherCollection = DatabaseEngine.getWeatherCollection();
        const readStream = fs.createReadStream(newestFile);
        
        let i = 0;
        let data: any[] = [];
        await csv({ignoreColumns: /^\s*$/}).fromStream(readStream).subscribe((json) => {
            i++;
            data.push(json);
            return new Promise( async (resolve, reject) => {
                try {
                    // At every N rows insert into DB
                    if (i % 300 == 0) {
                        await weatherCollection.bulkWrite(createBulkOps(await transformData(data)));
                        data = [];
                    }
                } catch (e) {
                    console.error(new Date().toJSON(), e);
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
        console.error(new Date().toJSON(), e);
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
    if (!regex) regex = new RegExp("[0-9]{2,4}(-|/)[0-9]{2}(-|/)[0-9]{2,4}(( |_|T)[0-9]{0,2}(:|h|H||_)[0-9]{0,2}(:||_)[0-9]{0,2}(\.[0-9]{0,3})?){0,1}");

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

    if (time && (time.includes("h") || time.includes("H"))) time = time.replace(new RegExp("h|H"), ":"); 

    if (time && !time.includes(":")) {
        if (time.length == 4) time = time.slice(0,2)+':'+time.slice(2);
        if (time.length == 3) time = time.slice(0,1)+':'+time.slice(1);
    }
    if (day.length == 4) {
        let aux = day;
        day = year;
        year = aux;
    }

    return { date: `${year}-${month}-${day}${time ? ' '+time : ''}`, format: !time ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm" };
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

    const { WEATHER_FIELD_TO_MATCH, DATABASE_FIELD_TO_MATCH } = await readGeneralMetadata();

    // Loop through data 
    for (const d of data) {
        if (!d.hasOwnProperty(WEATHER_FIELD_TO_MATCH)) continue;

        const regionPossibleNames = allReplacements(d[WEATHER_FIELD_TO_MATCH], "-", " ");
        const projection: FeaturesProjection = { _id: 1, geometry: 0 };
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
            const extractedDate = extractAndFormatDateFromString(date)
            const convertedDate = dayjs(extractedDate.date).tz(tz, true).toISOString();
            const dateToInsert = new Date(convertedDate);
            formattedDates.push(dateToInsert);
            return { updateOne: 
                {
                    filter: { "date": dateToInsert }, 
                    update: { $setOnInsert: { "date": dateToInsert, "format": extractedDate.format } },
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
            const extractedDate = extractAndFormatDateFromString(date)
            const convertedDate = dayjs(extractedDate.date).tz(tz, true).toISOString();
            sample.weatherDateObjectId = datesFromDB.find(doc => new Date(doc.date).valueOf() == new Date(convertedDate).valueOf())?._id;

            // Add region id and push to array
            for (const region of regions) {
                let newSample = { ...sample };

                // Add region Id
                newSample.regionBorderFeatureObjectId = region?._id || null;

                // Push sample to array
                if (Object.keys(newSample).length > 0) transformedData.push(newSample);
            }  
        }
    }

    return transformedData;
}


export async function generateAlerts(locations: any[], numDaysAhead?: number) {
    try {
        if (!locations.length) return {};
        
        const weatherFields = await DatabaseEngine.getWeatherMetadataCollection().find({ active: true }).toArray();
        if (!weatherFields || !weatherFields.length) return {};

        const weatherField = weatherFields.find((f:any) => f.main == true && f.active == true);
        if (!weatherField) return {};

        let features: any[] = [];

        for (const location of locations) {
            const feature = await DatabaseEngine.getFeaturesCollection().findOne({
                "geometry": {
                    $geoIntersects: {
                        $geometry: {
                            "type": "Point",
                            "coordinates": [location.lng, location.lat]
                        }
                    }
                }
            });

            if (!feature) continue;

            const stringId = feature._id.toString();
            const ix = features.findIndex((f:any) => f._id == stringId);
            if (ix < 0) {
                features.push({ _id: feature._id, properties: feature.properties, locations: [location] });
            } else {
                features[ix].locations.push(location);
            }
        }

        const regionsIds = features.map(f => f._id);
        if (!regionsIds.length) return {};

        const datesCollectionName = DatabaseEngine.getWeatherDatesCollectionName();
    //const startDate = new Date();

        const dates = await DatabaseEngine.getWeatherDatesCollection().find().toArray();
        const datesSorted = [...dates]; 
        datesSorted.sort((a,b) => {
            const valueA = new Date(a.date).valueOf();
            const valueB = new Date(b.date).valueOf();
            if (valueA >= valueB) return -1;
            else return 1;
        });
        const firstDate = datesSorted.find(d => d.date.valueOf() <= new Date().valueOf());
        const startDate = new Date(firstDate.date);

        const { ALERT_NUM_DAYS_AHEAD, DB_REGION_NAME_FIELD } = await readGeneralMetadata();

        if (!numDaysAhead) numDaysAhead = parseInt(ALERT_NUM_DAYS_AHEAD);
        const endDate = new Date(new Date().valueOf() + (numDaysAhead * 24 * 60 * 60 * 1000));

        const weatherFieldAlertable = weatherField.ranges.filter((r:any) => r.alert == true);
        if (!weatherFieldAlertable || !weatherFieldAlertable.length) return {};

        const orQuery = [];
        for (const alertable of weatherFieldAlertable) {
            let min = alertable.min;
            let max = alertable.max;
            if (alertable.min == null || isNaN(alertable.min)) min = -Infinity;
            if (alertable.max == null || isNaN(alertable.max)) max = Infinity;
            orQuery.push({ 
                [`weather.${weatherField.name}`]: { $gte: min, $lt: max }
            })
        }

        const alerts = await DatabaseEngine.getWeatherCollection().aggregate([
            { 
                $match: { 
                    regionBorderFeatureObjectId: { $in: regionsIds },
                    $or: orQuery
                }
            },
            { $lookup: {
                from: datesCollectionName,
                localField: 'weatherDateObjectId',
                foreignField: '_id',
                as: 'date',
                pipeline: [
                    {
                        $match: { "date": { $gte: startDate, $lt: endDate } }
                    }
                ]
                }
            },
            {
                $match: { date: { $ne: [] } }
            },
            {
                $project: { /* [`weather.${weatherField.name}`]: 1, */ weather: 1, date: 1, "regionBorderFeatureObjectId": 1, "weatherDateObjectId": 1}
            }
        ]).toArray();

        for (const alert of alerts) {
            const feature = features.find(f => f._id.toString() == alert.regionBorderFeatureObjectId);
            alert.regionName = getObjectValue(DB_REGION_NAME_FIELD, feature);
            alert.locations = feature.locations;

            /* let recommendations: any = [];
            for (const r of weatherFieldAlertable) {
                let min = r.min;
                let max = r.max;
                if (!r.min || isNaN(r.min)) min = -Infinity;
                if (!r.max || isNaN(r.max)) max = Infinity;
                const value = alert.weather[weatherField.name];
                if ((min <= value) && (value < max) && r.recommendations) {
                    for (const rec of r.recommendations) {
                        if (!recommendations.includes(rec)) recommendations.push(rec);
                    }
                }
            } */
            let recommendations: string[] = [];
            for (const field of weatherFields) {
                if (!field.active) continue;
                const value = alert.weather[field.name];
                if (value == null || isNaN(value)) continue;
                for (let r of field.ranges) {
                    let min = r.min;
                    let max = r.max;
                    if (r.min == null || isNaN(r.min)) min = -Infinity;
                    if (r.max == null || isNaN(r.max)) max = Infinity;
                    if ((min <= value) && (value < max) && r.recommendations) {
                        for (const rec of r.recommendations) {
                            if (!recommendations.includes(rec)) recommendations.push(rec);
                        }
                    }
                }
            }
            alert.weather = { name: weatherField.displayName, value: alert.weather[weatherField.name] };
            alert.recommendations = recommendations;
        }

        alerts.sort((a,b) => new Date(a.date[0].date).valueOf() - new Date(b.date[0].date).valueOf())

        return { numDaysAhead: ALERT_NUM_DAYS_AHEAD, alerts };
    } catch (e) {
        console.error(new Date().toJSON(), JSON.stringify(e))
        return {};
    }
}


export async function sendAlertsByEmail() {
    try {
        const users = await DatabaseEngine.getUsersCollection().find({ role: Role.USER, alertByEmail: true }).toArray();
        if (!users.length) return;

        const transporter = getEmailTransporter();

        console.log("FOUND USERS", users.length);
        for (const user of users) {
            console.log(user._id, user.locations);
            if (!user.locations || !user.locations.length || !user.email) continue;

            const locations = user.locations.map((location: any) => JSON.parse(decrypt(location)))
                                .map((location: any) => {
                                    return {
                                        _id: location._id,
                                        name: location.name,
                                        lat: location.position.lat,
                                        lng: location.position.lng
                                    }
                                });

            const data = await generateAlerts(locations, 2);
            if (!data.alerts || !data.alerts.length) continue;

            const alerts = data.alerts.filter(a => new Date(a.date[0].date).valueOf() > new Date().valueOf());

            if (!alerts.length) continue;

            const htmlMsg = generateHtmlMessage(alerts, user._id.toString());

            const mailOptions = {
                to: user.email,
                subject: 'RELIABLE: Alertas previstos',
                html: htmlMsg
            };

            console.log("-->", user._id, htmlMsg);
            
            await new Promise((resolve, reject) => {
                return transporter.sendMail(mailOptions, function(error, info) {
                    if (error) {
                        console.error(new Date().toJSON(), error);
                        return reject(error);
                    } else {
                        console.log(new Date().toJSON(), `Email sent: ${info.response}`);
                        return resolve(true);
                    }
                }); 
            })
        };

        return;
    } catch (e) {
        console.error(new Date().toJSON(), JSON.stringify(e));
        return;
    }
}

function generateHtmlMessage(alerts: any, userId: string) {
    let message = '<p>Alertas previstos:</p>';

    for (const a of alerts) {
        let names: string[] = [];
        a.locations.forEach((l: any) => {
          if (l.name) names.push(l.name);
        });

        if (names.length) `<p><strong${a.regionName} (${names.join()})></strong></p>`;
        else message += `<p>><strong>${a.regionName}></strong></p>`;

        message += `com ${a.weather.name} de <strong>${a.weather.value}</strong>`;
        message += `em ${dayjs(a.date[0].date).tz(tz).format(`dddd, D MMMM ${a.date[0].format.includes(":") ? "HH:mm" : ''}`)}`;

        message += `<p>Recomendações:</p>`;
        message += `<ul>`;
        
        if (a.recommendations && a.recomendations.length) {
            a.recommendations.forEach((recommendation: string) => {
                message += `<li>${recommendation}</li>`;
            });
            message += `</ul>`;
        }
    }
    message += `<p>
        Em caso de dúvida ou necessidade ligar para o SNS 24 (808 24 24 24)<br></br>
        Em caso de emergência ligue para o 112<br></br>
        Para informações mais detalhadas consulte o <a target="_blank" href="https://www.dgs.pt/">site da DGS</a></p>`;

    message += `<p><a href='/${userId}/unsubscribe'>Cancelar subscrição</a></p>`;
    return message;
}

function getEmailTransporter() {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'youremail@gmail.com',
          pass: 'yourpassword'
        },
        secure: true,
        tls: {
            rejectUnauthorized: false
        }
    });

    return transporter;
}