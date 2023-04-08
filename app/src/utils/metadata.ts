import fs from "fs";
import path from "path";
const filename = "generalMetadata.json";
const filePath = path.resolve("src", "configs", filename);

export async function readGeneralMetadata() {    
    try {
        const src = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(src);
        return data;
    } catch (e) {
        console.error(new Date().toJSON(), JSON.stringify(e));
        throw e;
    }
}

export async function writeGeneralMetadata(updatedJson: any) {    
    try {   
        fs.writeFileSync(filePath, updatedJson);
        return;
    } catch (e) {
        console.error(new Date().toJSON(), JSON.stringify(e));
        throw e;
    }
}