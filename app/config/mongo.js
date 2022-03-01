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