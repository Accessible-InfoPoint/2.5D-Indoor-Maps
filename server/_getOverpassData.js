/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */ // we check whether localStorage is undefined or null
const downloadResource = require("./_downloadResource");
const {RESOURCES_TO_DOWNLOAD, MAX_OVERPASS_FILE_AGE_IN_DAYS} = require("./constants");
const fs = require("fs");
const path = require("path");

const LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./tmp/localStorage');

module.exports = function getOverpassData() {
    console.log("=== Downloading Overpass data ===");

    const downloadPromises = [];

    RESOURCES_TO_DOWNLOAD.forEach(resource => {

        if (fs.existsSync(path.resolve(__dirname, resource.dest)) && !needToReDownloadFile(resource.dest)) {
            return;
        }

        downloadPromises.push(downloadResource(resource.url, resource.dest).then(() => {
            localStorage.setItem(resource.dest, Date.now().toString());
        }));
    });

    return Promise.all(downloadPromises);
}

/**
 * Checks if there are valid OverPassFiles available.
 * The ages of the downloaded files are stored in LocalStorage,
 * with the file destination as key and the download date as value
 *
 * @param dest {string} file destination, used as storage key
 * @returns {boolean}
 */
function needToReDownloadFile(dest) {
    let needToDownload = true;
    const lastDownloadDate = localStorage.getItem(dest);

    if (lastDownloadDate !== null) {
        const fileAge = Date.now() - parseInt(lastDownloadDate);
        const fileAgeInDays = Math.floor((((fileAge / 1000) / 60) / 60) / 24);

        needToDownload = (fileAgeInDays >= MAX_OVERPASS_FILE_AGE_IN_DAYS);
    }

    return needToDownload;
}
