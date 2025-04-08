const osmToGeoJson = require("osmtogeojson");
const fs = require("fs");
const path = require("path");

module.exports = function transformToGeoJSONAndSaveFile(responseText, dest) {
    console.log('saving transformed GeoJSON data to ' + dest);

    if (fs.existsSync(path.resolve(__dirname, dest))) {
        console.log('File already exists: ' + dest + ', deleting...');
        fs.unlink(path.resolve(__dirname, dest), (err) => {
            if (err) {
                console.error('ERROR: Unable to delete file!');
            }
        });
    }

    const osmData = JSON.parse(responseText);

    let transformedData = osmToGeoJson(osmData);
    transformedData = JSON.stringify(transformedData);

    fs.writeFileSync(path.resolve(__dirname, dest), transformedData);
}
