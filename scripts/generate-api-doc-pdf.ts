import fs from "node:fs";
import path from "node:path";
import { finished } from "node:stream/promises";
import PDFDocument from "pdfkit";

const inputPath = path.resolve(process.cwd(), "docs", "API_Documentation.md");
const outputPath = path.resolve(process.cwd(), "docs", "API_Documentation.pdf");

const markdown = fs.readFileSync(inputPath, "utf8");

const document = new PDFDocument({
  size: "A4",
  margin: 48
});

document.info.Title = "NutriPlanner API Documentation";
document.info.Author = "NutriPlanner Coursework Project";
document.info.Subject = "Web API endpoint specification";

const output = fs.createWriteStream(outputPath);
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

finished(output)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`API documentation PDF generated at: ${outputPath}`);
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });

