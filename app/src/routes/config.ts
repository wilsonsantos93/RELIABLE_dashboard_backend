//! Express
import express from "express";
export let configRouter = express.Router();

//! Page that allows a client to send geoJSONs to the server, or delete database collections
configRouter.get("/config", function (request, response) {
  response.sendFile("config.html", { root: "./src/views" });
});
