// // Mongo database
// import mongoClient from 'mongodb';
// const { MongoClient } = mongoClient;
//
//
// Environment variables for the database connection
import dotenv from 'dotenv';
dotenv.config(); // Loads .env file contents into process.env

// Mongoose
const mongoose = require('mongoose');
let DatabaseConnectionString = 'mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_URL + '/test';
mongoose.connect(DatabaseConnectionString);
const weatherData = mongoose.model('weatherData', { name: String });
const madeiraWeather = new weatherData({ name: 'Rain' });
madeiraWeather.save().then(() => console.log('meow'));
//
// let databaseInstance;
//
// export class WeatherDatabase {
//
//     static connectToDatabase(){
//
//         console.log(process.env)
//
//         let DatabaseConnectionString = 'mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@' + process.env.DB_URL + '/test';
//
//         MongoClient.connect(DatabaseConnectionString,
//             { useUnifiedTopology: true},
//             function(error, databaseSocket) {
//
//             if (error) throw error;
//
//             else {
//
//                 console.log("Connected to the MongoDB engine.");
//                 databaseInstance = databaseSocket.db("weather_website");
//
//
//             }
//         });
//     }
//
//     static getDatabaseInstance(){
//         return databaseInstance;
//     }
//
// };
//
