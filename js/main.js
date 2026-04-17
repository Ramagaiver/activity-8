(function(){
    window.onload = setMap;

    // Variable for the currently selected region
    var activeRegion = null;

    // Variables for data join
    var attrArray = ["Formal Workforce", "Informal Workforce", "Total Workforce", "Informal Workforce % of Total Workforce", "Informal Workforce > Formal Workforce"];
    
    // Starter variable for the percentage attribute
    var expressed = attrArray[3];

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

    function setMap(){
        // This sets initial width and height, although its probably obsolete due to CSS styles
        var width = window.innerWidth,
            height = window.innerHeight;

        // Creates SVG containers for the map
        var svg = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

       // This group handles map recentering/rescaling for regions
        var map = svg.append("g")
            .attr("class", "map-layers");

        // Handles equal area projection
        var projection = d3.geoCylindricalEqualArea()
            .parallel(0)
            .rotate([-100.5, -13.7])
            .scale(3500)
            .translate([width / 2, height / 2.2]);
            
        // Applies the projection to the data
        var path = d3.geoPath()
            .projection(projection);

        // Asynchronously loads all data
        var promises = [
                d3.csv("data/FORMAL vs INFORMAL Employment in Thailand 2024 by Province.csv"),                    
                d3.json("data/Countries2.topojson"),                    
                d3.json("data/Provinces2.topojson")                   
            ];  
        Promise.all(promises).then(function(data) {
                // Pass map and path to the callback   
                callback(data, map, path);
            });

        // Function responsible for getting all necessary data
        function callback(data, map, path){    
            var csvData = data[0],    
                asia = data[1],    
                thailand = data[2];

            setGraticule(map, path)

            // TopoJSON -> GeoJSON
            var asianCountries = topojson.feature(asia, asia.objects.Countries2),
                thaiProvinces = topojson.feature(thailand, thailand.objects['Provinces2']).features;

            // Renders background countries (Countries.topojson)
            var countries = map.append("path")
                .datum(asianCountries)
                .attr("class", "countries")
                .attr("d", path);    

            // Join csv data to GeoJSON enumeration units
            thaiProvinces = joinData(thaiProvinces, csvData)


            var colorScale = makeColorScale(csvData);

            // Add enumeration units to the map
            setEnumerationUnits(thaiProvinces, map, path, colorScale);

            // setChart(csvData, colorScale)
            createDropdown(csvData, thaiProvinces, map);
        };
    }

    function setChart(csvData, colorScale){
        // Chart dimensions
        var chartWidth = 700,
            chartHeight = 460;

        // Chart html element
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // Handles the scale for bars such that they're proportional to chartHeight
        var yScale = d3.scaleLinear()
            .range([chartHeight, 0])
            .domain([0, 100]);

        // Assigns bars for each province
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.Province;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed]));
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            });

        // Vertical y-axis generator
        var yAxis = d3.axisRight()
            .scale(yScale);

        // Places the y-axis on the right-sided edge of the chart
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + chartWidth + ", 0)")
            .call(yAxis);

        // Chart title
        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed + " by Province");
    }

    // function createDropdown(){
    //     //add select element
    //     var dropdown = d3.select("body")
    //         .append("select")
    //         .attr("class", "dropdown");

    //     //add initial option
    //     var titleOption = dropdown.append("option")
    //         .attr("class", "titleOption")
    //         .attr("disabled", "true")
    //         .text("Select Attribute");

    //     //add attribute name options
    //     var attrOptions = dropdown.selectAll("attrOptions")
    //         .data(attrArray)
    //         .enter()
    //         .append("option")
    //         .attr("value", function(d){ return d })
    //         .text(function(d){ return d });
    // };

    function makeColorScale(data){
        // Color palette
        var colorClasses = [
            "#ffe7db",
            "#fedbcb",
            "#fcaf94",
            "#fc8161",
            "#f44f39",
            "#d52221",
            "#aa1016",
            "#67000d"
        ];

        // Creates the color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses)

        // Builds an array for all the values of the expressed attribute
        // This should be remade into its own function eventually when all attributes
        // are accounted for
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat((data[i][expressed]).replace(/,/g, ""));
            domainArray.push(val);
        };

        colorScale.domain(domainArray);

        return colorScale;
    }

    function setGraticule(map, path){
        // Creates graticules every 5 degrees long/lat
        var graticule = d3.geoGraticule()

            // I tried figuring out why the graticule and its fill keeps cutting off in the top-right, but at this time I haven't found a solution
            // besides setting the map element's background to the same color as the graticule fill
            // TODO: Fix this
            .extent([[80, -5], [150, 500]])
            .step([5, 5]);

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) // Binds the graticule background
            .attr("class", "gratBackground") // Class for styling
            .attr("d", path)

        // Renders and creates graticule elements
        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines()) // Binds a graticule to each element
            .enter() // Creates an element for each datum
            .append("path")
            .attr("class", "gratLines") // Class for styling
            .attr("d", path); // Applies projection to graticules   
    }

    function joinData(thaiProvinces, csvData){
        // This loops through the csv and assigns each attribute to a geojson feature
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i];
            var csvKey = csvRegion.Province; // The primary attribute that is joined from the csv

            // Loops through the geojson to find corresponding primary attribute for the csv
            for (var a=0; a<thaiProvinces.length; a++){

                var geojsonProps = thaiProvinces[a].properties;
                var geojsonKey = geojsonProps.name; // The primary attribute that is joined from the geojson

                // Whenever primary attributes match, transfer the csv attributes to the geojson
                if (geojsonKey == csvKey){

                    // Activity 10 utilizes the parseFloat function. However, since my dataset includes booleans,
                    // an additional conditional check is necessary before parsing all transfered attributes.
                    // Additionally, the presence of commas requires the use of the replace() method.
                    attrArray.forEach(function(attr){
                        var val = csvRegion[attr];

                        if (attr !== "Informal Workforce > Formal Workforce"){
                            // Parses all non-boolean values
                            val = parseFloat(csvRegion[attr].replace(/,/g, ""));
                        }

                        // Assigns the attribute to the geojson
                        geojsonProps[attr] = val;
                    });
                };
            };
        };

        console.log(thaiProvinces)
        return thaiProvinces
    }

    function setEnumerationUnits(thaiProvinces, map, path, colorScale){
        
        // Default region color pallette
        var regionColors = {
            "Northern": "#3ce67b",
            "Northeastern": "#f8a20c",
            "Central": "#ffd0d0",
            "Eastern": "#3ce67b", 
            "Western": "#f8a20c",
            "Southern": "#ffd0d0"
        };

        // Render Thai provinces and apply default region colors
        var provinces = map.selectAll(".provinces")
            .data(thaiProvinces)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "provinces " + d.properties.name; 
            })
            .attr("d", path)
            // Set initial color based on the region palette
            .style("fill", function(d){
                var region = d.properties.region;
                return regionColors[region] ? regionColors[region] : "#ccc"; // Fallback to gray if region is missing
            })
            .style("stroke", "#fff")
            .style("stroke-width", "0.5px")
            .style("cursor", "pointer") // Change mouse to pointer to show it's clickable
            
            // Region selection event click listener
            .on("click", function(event, d){
                var clickedRegion = d.properties.region;

                // IF: User clicks on already active region; resets province color
                if (activeRegion === clickedRegion) {
                    activeRegion = null; // Clear active state

                    map.selectAll(".provinces")
                        .transition()
                        .duration(300)
                        .style("fill", function(p){
                            // Return all provinces to their original region colors
                            var region = p.properties.region;
                            return regionColors[region] ? regionColors[region] : "#ccc";
                        });

                    zoomMap(activeRegion, map);

                    // This deletes the currently loaded chart
                    d3.select(".chart").remove();
                } 
                // IF: User clicks on a new region; color provinces
                else {
                    activeRegion = clickedRegion; // Set new active state

                    map.selectAll(".provinces")
                        .transition()
                        .duration(300)
                        .style("fill", function(p){
                            if (p.properties.region === activeRegion) {
                                // Loads in the color scheme for the expressed attribute
                                var colorPalette = p.properties[expressed];
                                if (colorPalette) {
                                    return colorScale(colorPalette)
                                } else {
                                    return "#ccc"
                                }
                            } else {
                                // Gray out all other regions
                                return "#ccc"; // A nice soft gray
                            }
                        });

                    zoomMap(activeRegion, map);

                    // Filters data to only display the selected region
                    var regionData = thaiProvinces
                        .map(function(province) {return province.properties;})
                        .filter(function(props) {return props.region === activeRegion;})

                        d3.select(".chart").remove();
                        setChart(regionData, colorScale)
                }
            });
    }

    // Function to handle map zooming
    function zoomMap(activeRegion, map) {
        
        // Redefine the current window width and height for every click
        var width = window.innerWidth;
        var height = window.innerHeight;

        // Projection offsets from the original .rotate element
        var regionZoomValues = {
            "Northeastern": { offset: [70, -195], scale: 3.2 },
            "Northern":     { offset: [-150, -350], scale: 4 },
            "Central":      { offset: [-60, -150], scale: 3 },
            "Eastern":      { offset: [30, 0],   scale: 4.5 },
            "Western":      { offset: [-80, -80],  scale: 2.1 },
            "Southern":     { offset: [-80, 285],  scale: 2.7 }
        };
        
        // Zoom out
        if (activeRegion === null) {
            map.transition()
                .delay(300)
                .duration(750)
                .attr("transform", "translate(0,0)scale(1)");
        } else {
            // Get regionZoomValues for calculation
            var cachedMath = regionZoomValues[activeRegion];
            if (!cachedMath) return; 

            var cx = cachedMath.offset[0];
            var cy = cachedMath.offset[1];
            var scale = cachedMath.scale;

            // Formula to center the offset with any webpage size
            var translateX = (width / 2) - scale * ((width / 2) + cx);
            var translateY = (height / 2) - scale * ((height / 2) + cy);

            // Zoom in

            console.log(translateX, translateY)

            map.transition()
                .delay(300)
                .duration(750)
                .attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
        }
    }

    // function introAbstract(){

    //     const abstract = document.getElementById("abstract");
    // }
})();