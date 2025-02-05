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
    email: string;
    role: Role;
    alertByEmail?: boolean;
    locations?: { _id: ObjectId | string, name: string | null, lat: number, lng: number }[] | { iv: string, encryptedData: string}[];
}