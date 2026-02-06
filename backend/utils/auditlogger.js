import { error } from "console";
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, "..", "logs");

fs.mkdirSync(path.dirname(logsDir), { recursive: true });

function getHourKey(date = new Date()) {
    return date.toISOString().slice(0, 13); // 2026-02-07T18
}

function getLogFilePath() {
    const hourKey = getHourKey().replace("T", "-");
    return path.join(logsDir, `audit-${hourKey}.log`);
}


export function auditLog({ ip, socketid, action }) {
    const timestamp = new Date().toISOString();
    const logFilePath = getLogFilePath();

    const logentry = `${timestamp}  |  IP : ${ip}  |  socketid : ${socketid}  |  Action : ${action}  |\n`;

    fs.appendFile(logFilePath, logentry, (error) => {
        if (error) console.error("Failed to write audit log", error);
    });
}


setInterval(() => {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const now = Date.now();

    fs.readdir(logsDir, (err, files) => {
        if (err) return console.error("Failed to read logs directory", err);

        files.filter(file => file.startsWith("audit-") && file.endsWith(".log")).forEach(file => {
            const filePath = path.join(logsDir, file);

            fs.stat(filePath, (err, stats) => {
                if (err) return;

                const fileage = now - stats.mtimeMs;

                if (age > SIX_HOURS) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error("Failed to delete old log", file);
                        }
                    })
                }


            })


        })
    })



}, 6 * 60 * 60 * 1000);



