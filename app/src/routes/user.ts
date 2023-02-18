import { handleUpdateUser, handleGetUsers, handleCreateUser, handlDeleteUser, handleGetUserFields } from "../controllers/user.js";
import { Role } from "../models/User.js";
import { Router } from "express";
import { authenticateAPI } from "../utils/routes.js";

const router = Router();

//! Route that requests all users
router.get("/", authenticateAPI(Role.ADMIN), async function (request, response) {
    await handleGetUsers(request, response); 
});

//! Route that creates a new user
router.post("/create", authenticateAPI(Role.ADMIN), async function (request, response) {
    await handleCreateUser(request, response); 
});

//! Route that update a user
router.post("/:id/update", authenticateAPI(Role.ADMIN), async function (request, response) {
    await handleUpdateUser(request, response); 
});

//! Route that deletes a user
router.post("/:id/delete", authenticateAPI(Role.ADMIN), async function (request, response) {
    await handlDeleteUser(request, response); 
});

//! Route that gets user fields
router.get("/fields", authenticateAPI(Role.ADMIN), async function (request, response) {
    await handleGetUserFields(request, response); 
});

export default router;