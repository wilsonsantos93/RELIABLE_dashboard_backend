import { Router } from "express";
import { createMetadata, deleteAllMetadata, deleteMetadata, getCreateMetadataPage, getEditMetadataPage, getMetadata, getMetadataFields, getMetadataPage, metadataRedirect, updateMetadata } from "../../controllers/admin/metadata.js";
import { authenticateAdmin } from "../../utils/routes.js";

const router = Router();

// Get weather metadata page
router.get('/metadata', authenticateAdmin, getMetadataPage);

// Get create weather metadata page
router.get('/metadata/create', authenticateAdmin, getCreateMetadataPage);

// Get edit weather metadata page
router.get('/metadata/:id/edit', authenticateAdmin, getEditMetadataPage);

// Route to get metadata
router.get('/metadata/getMetadata', authenticateAdmin, getMetadata);

// Route to get metadata fields
router.get('/metadata/fields', authenticateAdmin, getMetadataFields);

// Route to add weather metadata
router.post('/metadata/create', authenticateAdmin, createMetadata);

// Route to update specific weather metadata
router.post('/metadata/:id/update', authenticateAdmin, updateMetadata);

// Route to redirect after ajax update
router.post('/metadata/redirect', authenticateAdmin, metadataRedirect);

// Route to delete specific weather metadata
router.post('/metadata/:id/delete', authenticateAdmin, deleteMetadata);

// Route to delete all weather metadata
router.post('/metadata/deleteAll', authenticateAdmin, deleteAllMetadata);

export default router;