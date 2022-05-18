import fetch from "cross-fetch";
import {FeatureWeather} from "../models/FeatureProperties";

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