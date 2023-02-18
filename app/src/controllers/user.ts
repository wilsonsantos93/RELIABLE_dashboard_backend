import { Request, Response } from "express-serve-static-core";
import { ObjectId } from "mongodb";
import { DatabaseEngine } from "../configs/mongo.js";

export async function handleGetUsers(request: Request, response: Response) {
    let skip = parseInt(request.query.start as string) || 0;
    let limit = parseInt(request.query.length as string) || 0;

    const find: any = {};
    for (const col of request.query.columns as any[]) {
        if (!col.search.value || col.search.value == '') continue;
        if (col.name == "_id" && ObjectId.isValid(col.search.value)) find[col.name] = new ObjectId(col.search.value);
        else find[col.name] = new RegExp(col.search.value, 'i');
    }

    const projection: any = { "password": 0 };

    const recordsTotal = await DatabaseEngine.getUsersCollection().countDocuments();
    const recordsFiltered = (await DatabaseEngine.getUsersCollection().find(find).toArray()).length;
    const users = await DatabaseEngine.getUsersCollection().find(find, projection).skip(skip).limit(limit).toArray();

    if (request.query.dt) {
        return response.json({ 
            data: users,
            draw: request.query.draw, 
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered
        })
    } 

    return response.json(users);
}

export async function handleCreateUser(request: Request, response: Response) {
    return
}

export async function handleUpdateUser(request: Request, response: Response) {
    return
}

export async function handlDeleteUser(request: Request, response: Response) {
    return
}


export async function handleGetUserFields(request: Request, response: Response) {
    function flattenObject(obj: any, prefix = '') {
        return Object.keys(obj).reduce((acc:any, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && k != "_id") Object.assign(acc, flattenObject(obj[k], pre + k));
            else acc[pre + k] = obj[k];
            return acc;
        }, {});
    }
    
    const projection = { "password": 0 };
    const data = await DatabaseEngine.getUsersCollection().find({}, { projection }).toArray();
    let columnNames: any = [];
    for (const d of data) {
        const keys = Object.keys(flattenObject(d))
        for (const k of keys) {
            if (!columnNames.includes(k)) columnNames.push(k);
        }
    }

    return response.json(columnNames);
}