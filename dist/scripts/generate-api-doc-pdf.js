"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:stream/promises");
const pdfkit_1 = __importDefault(require("pdfkit"));
const inputPath = node_path_1.default.resolve(process.cwd(), "docs", "API_Documentation.md");
const outputPath = node_path_1.default.resolve(process.cwd(), "docs", "API_Documentation.pdf");
const markdown = node_fs_1.default.readFileSync(inputPath, "utf8");
const document = new pdfkit_1.default({
    size: "A4",
    margin: 48
});
document.info.Title = "NutriPlanner API Documentation";
document.info.Author = "NutriPlanner Coursework Project";
document.info.Subject = "Web API endpoint specification";
const output = node_fs_1.default.createWriteStream(outputPath);
document.pipe(output);
const lines = markdown.split(/\r?\n/);
let inCodeBlock = false;
for (const line of lines) {
    if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        document.moveDown(0.3);
        continue;
    }
    if (inCodeBlock) {
        document.font("Courier").fontSize(9).text(line || " ", {
            width: 500
        });
        continue;
    }
    if (line.startsWith("# ")) {
        document.moveDown(0.4);
        document.font("Helvetica-Bold").fontSize(18).text(line.replace(/^#\s*/, ""));
        document.moveDown(0.2);
        continue;
    }
    if (line.startsWith("## ")) {
        document.moveDown(0.2);
        document.font("Helvetica-Bold").fontSize(14).text(line.replace(/^##\s*/, ""));
        continue;
    }
    if (line.startsWith("### ")) {
        document.font("Helvetica-Bold").fontSize(12).text(line.replace(/^###\s*/, ""));
        continue;
    }
    if (line.startsWith("- ")) {
        document.font("Helvetica").fontSize(10).text(`• ${line.slice(2)}`, {
            indent: 12
        });
        continue;
    }
    document.font("Helvetica").fontSize(10).text(line || " ", {
        width: 500
    });
}
document.end();
(0, promises_1.finished)(output)
    .then(() => {
    // eslint-disable-next-line no-console
    console.log(`API documentation PDF generated at: ${outputPath}`);
})
    .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
});
