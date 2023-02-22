import { ObjectId } from "mongodb";

export enum Role {
    ADMIN = "admin",
    USER = "user",
    DATA = "data"
}

export type User = {
    _id: ObjectId | string;
    username: string;
    password?: string;
    token: string;
    email: string;
    role: Role;
}