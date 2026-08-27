import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export function readData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}
