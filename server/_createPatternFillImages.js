/* eslint-disable @typescript-eslint/no-require-imports */
const jimp = require("jimp");
const path = require('path');
const fs = require('fs');
const { COLOR_PROFILE_FOLDER, CONSTANTS_PATH, PATTERN_FILL_IMAGES_FOLDER } = require("./constants");

module.exports = function createPatternFillImages() {
    console.log("=== Creating PatternFill Images ===");

    const fill_opacity = Math.floor(JSON.parse(fs.readFileSync(path.resolve(__dirname, CONSTANTS_PATH)))["FILL_OPACITY"] * 255).toString(16);

    fs.readdirSync(path.resolve(__dirname, COLOR_PROFILE_FOLDER)).forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, COLOR_PROFILE_FOLDER + file)));
        // console.log(data["roomColor"].replace("#", "0x") + fill_opacity);
        // console.log(parseInt(data["roomColor"].replace("#", "0x") + fill_opacity, 16));

        [[10, "small"], [12, "medium"], [14, "large"]].forEach((val) => {
            ["roomColor", "roomColorS", "toiletColor", "stairsColor"].forEach((colorStr) => {
                const image = new jimp.Jimp({ width: val[0], height: val[0]});
                for (let x = 0; x < val[0]; x++) {
                    for (let y = 0; y < val[0]; y++) {
                        if (
                            // pure diagonal
                            x == val[0] - 1 - y ||
                            // diagonal above
                            (["medium", "large"].includes(val[1]) && x == val[0] - 2 - y) ||
                            // diagonal below
                            (["medium", "large"].includes(val[1]) && x == val[0] - y) ||
                            // diagonal 2 above
                            (val[1] == "large" && x == val[0] - 3 - y) ||
                            // diagonal 2 below
                            (val[1] == "large" && x == val[0] +1 - y) ||
                            // pure corner
                            (["medium", "large"].includes(val[1]) && [0, 2*val[0] - 2].includes(x + y)) ||
                            // larger corner
                            (val[1] == "large" && [1, 2*val[0] - 3].includes(x + y))
                        ) {
                            image.setPixelColor(0xFF, x, y);
                        } else {
                            image.setPixelColor(parseInt(data[colorStr].replace("#", "0x") + fill_opacity, 16), x, y);
                        }
                    }
                }
    
                image.write(path.resolve(__dirname, PATTERN_FILL_IMAGES_FOLDER + (file == "default.json" ? "none": file.split(".")[0]) + "_" + val[1] + "_" + colorStr + ".png"), (err) => {
                    if (err) throw err;
                });
            });
        })
    });

    const image = new jimp.Jimp({ width: 10, height: 10});
    for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
            if (x == 9 - y) {
                image.setPixelColor(0xFF, x, y);
            } else {
                image.setPixelColor(0xFFFFFFFF, x, y);
            }
        }
    }

    image.write(path.resolve(__dirname, PATTERN_FILL_IMAGES_FOLDER + "blank.png"), (err) => {
        if (err) throw err;
    });
    console.log("...done.");
}