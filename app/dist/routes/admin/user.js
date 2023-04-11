import { Router } from "express";
import { getUsersPage, getCreateUserPage, handleCreateUser, getEditUserPage, handleUpdateUser, handleGetUsers, handleDeleteUser, handleGetUserFields } from "../../controllers/admin/users.js";
import { authenticateAdmin } from "../../utils/routes.js";
const router = Router();
//! Page that shows users 
router.get("/users", authenticateAdmin, getUsersPage);
// Page to create a new user
router.get("/users/create", authenticateAdmin, getCreateUserPage);
// Page to edit a user
router.get("/users/:id/edit", authenticateAdmin, getEditUserPage);
// Route to insert new user
router.post("/user/create", authenticateAdmin, handleCreateUser);
// Route to handle user update
router.post("/user/:id/update", authenticateAdmin, handleUpdateUser);
// Route to get users
router.get("/user/getUsers", authenticateAdmin, handleGetUsers);
// Route to delete a user
router.post("/user/:id/delete", authenticateAdmin, handleDeleteUser);
// Route to get user collection fields
router.get("/user/fields", authenticateAdmin, handleGetUserFields);
export default router;
//# sourceMappingURL=user.js.map