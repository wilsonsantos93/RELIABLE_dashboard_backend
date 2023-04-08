import { Router } from "express";
import { createMetadata, deleteAllMetadata, deleteMetadata, getCreateMetadataPage, getEditMetadataPage, getMetadata, getMetadataFields, getGeneralMetadataPage, getMetadataPage, metadataRedirect, updateGeneralMetadata, updateMetadata } from "../../controllers/admin/metadata.js";
import { authenticateAdmin } from "../../utils/routes.js";

const router = Router();

// Get general metadata page
router.get('/metadata/general', authenticateAdmin, getGeneralMetadataPage);

// Post general metadata
router.post('/metadata/general', authenticateAdmin, updateGeneralMetadata);

// Get weather metadata page
router.get('/metadata/weather', authenticateAdmin, getMetadataPage);

// Get create weather metadata page
router.get('/metadata/weather/create', authenticateAdmin, getCreateMetadataPage);

// Get edit weather metadata page
router.get('/metadata/weather/:id/edit', authenticateAdmin, getEditMetadataPage);

// Route to get metadata
router.get('/metadata/weather/getMetadata', authenticateAdmin, getMetadata);

// Route to get metadata fields
router.get('/metadata/weather/fields', authenticateAdmin, getMetadataFields);

// Route to add weather metadata
router.post('/metadata/weather/create', authenticateAdmin, createMetadata);

// Route to update specific weather metadata
router.post('/metadata/weather/:id/update', authenticateAdmin, updateMetadata);

// Route to redirect after ajax update
router.post('/metadata/weather/redirect', authenticateAdmin, metadataRedirect);

// Route to delete specific weather metadata
router.post('/metadata/weather/:id/delete', authenticateAdmin, deleteMetadata);

// Route to delete all weather metadata
router.post('/metadata/weather/deleteAll', authenticateAdmin, deleteAllMetadata);

export default router;