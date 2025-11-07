const fs = require("fs");
const path = require("path");

// Function to fix io references in a file
function fixIoReferences(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Replace io.to() calls with comments
  const ioPattern = /(\s+)(io\.to\([^)]+\)\.emit\([^)]+\));/g;
  const replacement =
    "$1// Socket.io will be handled by socket-service\n$1// $2;";

  if (ioPattern.test(content)) {
    content = content.replace(ioPattern, replacement);
    modified = true;
  }

  // Replace if (io) blocks
  const ifIoPattern = /(\s+)(if\s*\(\s*io\s*\)\s*\{[^}]*\})/gs;
  const ifIoReplacement =
    "$1// Socket.io will be handled by socket-service\n$1// $2";

  if (ifIoPattern.test(content)) {
    content = content.replace(ifIoPattern, ifIoReplacement);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed io references in: ${filePath}`);
  }
}

// Main execution
const helpersFile = path.join(
  __dirname,
  "api-service",
  "src",
  "helpers",
  "subscriptionHelpers.ts"
);
fixIoReferences(helpersFile);

console.log("io references fixing completed!");
