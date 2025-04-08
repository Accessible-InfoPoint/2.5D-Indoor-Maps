const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const transformToGeoJSONAndSaveFile = require('./_transformToGeoJsonAndSaveFile');

module.exports = function downloadResource(url, dest) {
    console.log('Downloading ' + url);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    transformToGeoJSONAndSaveFile(xhr.responseText, dest)
                    return resolve();
                } else if (xhr.status > 400) {
                    return reject('File could not be downloaded! (' + xhr.status + ' - ' + xhr.statusText + ')');
                }
            }
        };
        xhr.open('GET', url, true);
        xhr.send();
    });
}
