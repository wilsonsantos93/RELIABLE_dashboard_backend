import { Request, Response } from "express-serve-static-core";

export function getMetadataPage(req: Request, res: Response) {
    return res.render("metadata/index.ejs");
}

export function getCreateMetadataPage(req: Request, res: Response) {
    return res.render("metadata/index.ejs");
}

export function getEditMetadataPage(req: Request, res: Response) {
    return res.render("metadata/index.ejs");
}

export function getMetadata(req: Request, res: Response) {
    return res.json({});
}

export function getMetadataFields(req: Request, res: Response) {
    return res.json({});
}

export function updateMetadata(req: Request, res: Response) {
    return res.redirect("back");
}

export function deleteMetadata(req: Request, res: Response) {
    return res.redirect("back");
}

export function deleteAllMetadata(req: Request, res: Response) {
    return res.redirect("back");
}