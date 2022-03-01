// Environment variables for the database connection
import dotenv from 'dotenv';
dotenv.config(); // Loads .env file contents into process.env


// Weather database
import { WeatherDatabase } from "./config/mongo.js"; // Gets the environment variables to use for the database connection
WeatherDatabase.connectToDatabase();

// Get JSON from weather API
const request = require('request');
let weather_url = "https://www.reddit.com/r/popular.json";
let options = { json: true };
request(weather_url, options, (error, response, body) => {

    if (error) {
        throw error
    };

    if (!error && response.statusCode == 200) {


        const Cat = mongoose.model('Cat', { name: String });

        const kitty = new Cat({ name: 'Zildjian' });
        kitty.save().then(() => console.log('meow'));
        // do something with JSON, using the 'body' variable
    };
});
