import { DatabaseEngine } from "../../configs/mongo.js";
/**
 * Client requests all weather dates data to be deleted
 * @param req Client HTTP request object
 * @param response Client HTTP response object
 */
export async function handleDeleteWeatherDates(req, res) {
    try {
        await DatabaseEngine.getWeatherDatesCollection().deleteMany({});
        req.flash("success_message", "Server successfully cleared weather saved dates from the database.");
    }
    catch (e) {
        console.error(new Date().toJSON(), e);
        if (e && e.codeName === "NamespaceNotFound") {
            req.flash("error_message", "Weather saved dates collection doesn't exist in the database (was probably already deleted).");
        }
        else if (e) {
            req.flash("error_message", JSON.stringify(e));
        }
    }
    return res.redirect("/admin/home");
}
//# sourceMappingURL=dates.js.map