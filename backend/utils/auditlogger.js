import fs from "fs"
import path from "path"
import { fileURLToPath } from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const now = new Date();
const timestamp = now.toISOString().replace(/:/g, "-");

const logFilePath = path.join(__dirname, "..", "logs", `audit-${timestamp}.log`)

fs.mkdirSync(path.dirname(logFilePath), { recursive: true });

export function auditLog({ ip, socketid, action }) {
    const timestamp = new Date().toISOString();

    const logentry = `${timestamp}  |  IP : ${ip}  |  socketid : ${socketid}  |  Action : ${action}  |\n`;

    fs.appendFile(logFilePath, logentry, (error) => {
        if (error) console.error("Failed to write audit log", error);
    });
}




