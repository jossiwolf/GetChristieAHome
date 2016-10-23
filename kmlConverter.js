var options = {symbol: pointSymbol, name: 'Name'};

function genPlace(shelter) {
    var placemark = '<Placemark>\n'
    placemark += '<name>'+shelter.agency_address+'</name>\n'
    placemark += '<styleUrl>#west_campus_style</styleUrl>'
    placemark += ' <ExtendedData> <Data name="video"> <value><![CDATA[<iframe width="480" height="360" src="https://www.youtube.com/embed/ZE8ODPL2VPI" frameborder="0" allowfullscreen></iframe><br><br>]]></value> </Data> </ExtendedData> \n'
    placemark += '<Point>\n'
    placemark += '<coordinates>'+shelter.longitude+','+shelter.latitude+'</coordinates>\n'
    placemark += '</Point>\n'
    placemark += '</Placemark>\n'
    return placemark
}

var genKML = function(shelters) {
    var mykml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n\n';
    mykml += '<name>KmlFile</name>\n';
    mykml += '<Style id="west_campus_style"> <IconStyle> <Icon> <href>https://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png </href> </Icon> </IconStyle> <BalloonStyle> <text>$[video]</text> </BalloonStyle> </Style>';
for (index = 0; index < shelters.length; ++index) {

     mykml += genPlace(shelters[index]);
 }
    mykml += '</Document>\n</kml>'
    return mykml;
}


// Define feature symbol
var pointSymbol = {
    color: '#2dcd86',
    alpha: 255,
    scale: 1,
    icon: 'http://maps.google.com/mapfiles/kml/shapes/square.png'
};

module.exports.genKML = genKML;