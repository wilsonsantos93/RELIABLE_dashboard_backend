import { ObjectId } from "mongodb";

export type User = {
    _id: ObjectId | string;
    username: string;
    password?: string;
    token: string;
    email: string;
    isAdmin: boolean;
    roles: string[];
}