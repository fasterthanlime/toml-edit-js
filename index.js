//@ts-check

const { execSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");
const { replaceTomlString } = require("./toml-edit");
const TOML = require("@iarna/toml");

function main() {
  // tryPkgUpgrade(`samples/sample1.lock`, "main", "3.0");

  // for (const n of [1, 2, 3, 4, 5, 7, 8]) {
  //   tryUpgrade(`samples/sample${n}.toml`, "tokio", "2.0");
  // }

  tryUpgrade(`samples/sample8.toml`, "tokio", "2.0");
}

function tryUpgrade(filePath, depName, version) {
  let payload = readFileSync(filePath, { encoding: "utf8" });
  let initialPayload = payload;

  let obj = TOML.parse(payload);
  for (const depKind of [
    "dependencies",
    "dev-dependencies",
    "build-dependencies",
  ]) {
    if (obj[depKind] && obj[depKind][depName]) {
      if (typeof obj[depKind][depName] === "string") {
        payload = replaceTomlString(payload, [depKind, depName], version);
      } else if (obj[depKind][depName].version) {
        payload = replaceTomlString(
          payload,
          [depKind, depName, "version"],
          version
        );
      }
    }
  }

  console.log("\n", "============", filePath, "============");
  showDiff(initialPayload, payload);
}

function tryPkgUpgrade(filePath, depName, version) {
  let payload = readFileSync(filePath, { encoding: "utf8" });
  let initialPayload = payload;

  let obj = TOML.parse(payload);
  // @ts-ignore
  for (let i = 0; i < obj.package.length; i++) {
    let pkg = obj.package[i];
    if (pkg.name == depName) {
      payload = replaceTomlString(payload, ["package", i, "version"], version);
    }
  }

  console.log("====", filePath, "====");
  showDiff(initialPayload, payload);
}

function showDiff(before, after) {
  writeFileSync("/tmp/1", before, { encoding: "utf8" });
  writeFileSync("/tmp/2", after, { encoding: "utf8" });

  execSync("git --no-pager diff --no-index /tmp/1 /tmp/2 || exit 0", {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

main();
