export class InsertJson {
    static async insertJsonInBd(req) {
        //check if the data is valid
        if (!CheckJson.isValid(req)) {
            return { "msg": "invalid data to insert", "code": 500 };
        }
        var json = req.body.data;
        var db = DbConfig.getDatabaseInstance();
        if (!db) {
            return { "msg": "cannot connect to database", "code": 500 };
        }

        var collectionName = req.body.collectionName;
        if (!collectionName) {
            return { "msg": "invalid collection name", "code": 500 };
        }

        var result = await InsertJson.insertJsonDataInBd(json,collectionName);
        return result;


    }

    static async insertJsonDataInBd(data, collectionName) {
        var db = DbConfig.getDatabaseInstance();
        const collection = db.collection(collectionName);

        var error = false;
        await collection.insertMany(data, (err, res) => {
            if (err) error = true;

            else error = false;
        });

        if (error)
            return { "msg": "error inserting data", "code": 500 };
        else
            return { "msg": "data inserted with success", "code": 201 };
    }
};

