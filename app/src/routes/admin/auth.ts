import { Router } from "express";
import { getLoginPage, handleLogin, handleLogout } from "../../controllers/admin/auth.js";
import { authenticateAdmin, forwardAuthenticatedAdmin } from "../../utils/routes.js";

const router = Router();

// Get login page
router.get('/login', forwardAuthenticatedAdmin, getLoginPage);

// Route that handles admin login
router.post('/login', handleLogin);

// Route to logout admin
router.get('/logout', authenticateAdmin, handleLogout);

export default router;