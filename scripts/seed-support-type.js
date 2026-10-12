const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, eqIdx).trim()] = val;
    }
  });
}

const { PrismaClient } = require(path.resolve(__dirname, "../node_modules/@prisma/client"));
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.supportType.findFirst({
    where: { name: "Update dữ liệu" },
  });
  if (!existing) {
    await prisma.supportType.create({
      data: {
        code: "UPDATE_DATA",
        name: "Update dữ liệu",
        sortOrder: 15,
        isActive: true,
      },
    });
    console.log("Added 'Update dữ liệu' to support_types.");
  } else {
    console.log("'Update dữ liệu' already exists.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
