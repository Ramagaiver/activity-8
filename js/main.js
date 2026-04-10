(function(){
    window.onload = setMap;

    // Variables for data join
    var attrArray = ["Formal Workforce", "Informal Workforce", "Total Workforce", "Informal Workforce % of Total Workforce", "Informal Workforce > Formal Workforce"];
    
    // Starter variable for the percentage attribute
    var expressed = attrArray[3];

    function setMap(){
        // This sets initial width and height, although its probably obsolete due to CSS styles
        var width = window.innerWidth * 0.5,
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

        // Function responsible for getting all necessary data
        function callback(data, map, path){    
            var csvData = data[0],    
                asia = data[1],    
                thailand = data[2];

            setGraticule(map, path)

            // TopoJSON -> GeoJSON
            var asianCountries = topojson.feature(asia, asia.objects.Countries),
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

            setChart(csvData, colorScale)
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
        // Renders Thai provinces (Provinces2.topojson)
        var provinces = map.selectAll(".provinces")
            .data(thaiProvinces)
            .enter()
            .append("path")
            .attr("class", function(d){
                // This assigns a class for CSS and an ID
                return "provinces " + d.properties.name; 
            })
            .attr("d", path)

            // Colors provinces according to expressed attribute
            .style("fill", function(d){
                var value = d.properties[expressed];
                if (value){
                    return colorScale(d.properties[expressed]);
                } 
                else {
                    return "#ccc";
                }
            });
    }
})();