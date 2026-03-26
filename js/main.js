window.onload = setMap;

function setMap(){

    // This sets initial width and height, although its probably obsolete due to CSS styles
    var width = 900,
        height = 900;

    // Creates SVG containers for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Handles Albers equal area conic projection
    // Technically the Royal Thai Survey Department promotes the use of UTM, 
    // but I'd rather use something more stylistically pleasing and non-standard
    var projection = d3.geoAlbers()
        .center([160, 18.5])
        .rotate([66.45, -0.91, 0])
        .parallels([0.00, 25.00])
        .scale(4000)
        .translate([width / 2, height / 2]);
        
    // Applies the projection to the data
    var path = d3.geoPath()
        .projection(projection);

    // Asynchronously loads all data
    var promises = [
            d3.csv("data/FORMAL vs INFORMAL Employment in Thailand 2024 by Province.csv"),                    
            d3.json("data/Countries.topojson"),                    
            d3.json("data/Provinces2.topojson")                   
        ];  
    Promise.all(promises).then(function(data) {
            // Pass map and path to the callback   
            callback(data, map, path);
        });
}

// Function responsible for getting all necessary data
function callback(data, map, path){    
    var csvData = data[0],    
        asia = data[1],    
        thailand = data[2];

    // TopoJSON -> GeoJSON
    var asianCountries = topojson.feature(asia, asia.objects.Countries),
        thaiProvinces = topojson.feature(thailand, thailand.objects['Provinces2']).features;

    // Renders background countries (Countries.topojson)
    var countries = map.append("path")
        .datum(asianCountries)
        .attr("class", "countries")
        .attr("d", path);

    // Draws Thai provinces (Provinces2.topojson)
    var provinces = map.selectAll(".provinces")
        .data(thaiProvinces)
        .enter()
        .append("path")
        .attr("class", function(d){
            // This assigns a class for CSS and an ID
            return "provinces " + d.properties.name; 
        })
        .attr("d", path);
};