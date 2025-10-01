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