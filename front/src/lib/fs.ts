export function saveTextAsFile(text, filename) {
    const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.click();
}

export function saveUnitArrayAsFile(filename, encoded) {
    // var uriEncoded = encodeURIComponent(String.fromCharCode.apply(null, encoded));
    var hexStr = "";
    for (var i = 0; i < encoded.length; i++) {
        var s = encoded[i].toString(16);
        if (s.length == 1) s = '0' + s;
        hexStr += '%' + s;
    }
    var uriContent = 'data:application/octet-stream,' + hexStr;
    var pom = document.createElement('a');
    pom.setAttribute('href', uriContent);
    pom.setAttribute('download', filename);
    document.body.appendChild(pom);
    pom.click();
    document.body.removeChild(pom);
}

/**
 * Save arrayBuffe to file
 * @param arrayBuffer
 * @param fileName
 * @param fileType
 */
export default async function saveFile(arrayBuffer: ArrayBuffer, fileName: string, fileType: string) {
    return new Promise<void>((resolve, reject) => {
        const dataView = new DataView(arrayBuffer);
        const blob = new Blob([dataView], {type: fileType});

        // @ts-ignore
        if (navigator.msSaveBlob) {
            // @ts-ignore
            navigator.msSaveBlob(blob, fileName);
            return resolve();
        } else if (/iPhone|fxios/i.test(navigator.userAgent)) {
            // This method is much slower but createObjectURL
            // is buggy on iOS
            const reader = new FileReader();
            reader.addEventListener('loadend', () => {
                if (reader.error) {
                    return reject(reader.error);
                }
                if (reader.result) {
                    const a = document.createElement('a');
                    // @ts-ignore
                    a.href = reader.result;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                }
                resolve();
            });
            reader.readAsDataURL(blob);
        } else {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(downloadUrl);
            setTimeout(resolve, 100);
        }
    });
}