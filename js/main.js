(function(){
    // Variable for the currently selected region
    var activeRegion = null;

    // Variables for data join
    var attrArray = [
        "Informal Workforce % of Total Workforce", 
        "Formal Workforce % of Total Workforce",
        "Informal Workers (per 1,000)",
        "Formal Workers (per 1,000)",
        "Ratio of Informal to Formal Workers"
    ];
    
    // Starter variable for the percentage attribute
    var expressed = attrArray[0];

    // Chart dimensions
    var chartWidth = 700,
        chartHeight = 460;

    // Handles the scale for bars such that they're proportional to chartHeight
    var yScale = d3.scaleLinear()
        .range([chartHeight, 0])
        .domain([0, 100])

    // // Default region color pallette
    // var regionColors = {
    //     "Northern": "#3ce67b",
    //     "Northeastern": "#f8a20c",
    //     "Central": "#ffd0d0",
    //     "Eastern": "#3ce67b", 
    //     "Western": "#f8a20c",
    //     "Southern": "#ffd0d0"
    // };

    // Begin script when window loads
    window.onload = setMap;

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
        Promise.all(promises).then(function(data){
                // Pass map and path to the callback   
                callback(data, map, path);
            });

        // Function responsible for getting all necessary data
        function callback(data, map, path){    
            var csvData = data[0],    
                asia = data[1],    
                thailand = data[2];

            // Calculates normalized attributes
            csvData.forEach(function(d){
                // Parse raw data
                var informalCount = parseFloat(d["Informal Workforce"].replace(/,/g, ""));
                var formalCount = parseFloat(d["Formal Workforce"].replace(/,/g, ""));
                var totalCount = parseFloat(d["Total Workforce"].replace(/,/g, ""));
                var informalPct = parseFloat(d["Informal Workforce % of Total Workforce"]);

                // Formal Percentage
                d["Formal Workforce % of Total Workforce"] = parseFloat((100 - informalPct).toFixed(2));

                // Informal Workers per 1,000
                d["Informal Workers (per 1,000)"] = parseFloat(((informalCount / totalCount) * 1000).toFixed(2));

                // Formal Workers per 1,000
                d["Formal Workers (per 1,000)"] = parseFloat(((formalCount / totalCount) * 1000).toFixed(2));

                // Ratio of Informal to Formal
                d["Ratio of Informal to Formal Workers"] = parseFloat((informalCount / formalCount).toFixed(2));
            });

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
            setEnumerationUnits(thaiProvinces, map, path, csvData);

            // Loads an empty chart on initialization
            setChart([], csvData, colorScale);

            // Creates the dropdown menu
            createDropdown(csvData, thaiProvinces, map);
        };
    }

    function setChart(barData, fullData, colorScale){
        // Removes old charts before rendering new ones
        d3.select(".chart").remove();

        // Sorts data that will be rendered
        barData.sort(function(a, b){
            return a[expressed] - b[expressed];
        });

        // Chart html element
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // Determine which stat to use for the axis maximum
        var dataForMax = barData.length > 0 ? barData : fullData;

        // Updates yScale domain based on the appropriate stat
        if (expressed.includes("%")){
            yScale.domain([0, 100]);
        } else {
            // Calculates max for upper limit
            var max = d3.max(dataForMax, function(d){
                return parseFloat(String(d[expressed]).replace(/,/g, ""));
            });
            yScale.domain([0, max * 1.1]); 
        }

        // Assigns bars only for data passed in (regions/empty chart)
        var bars = chart.selectAll(".bars")
            .data(barData)
            .enter()
            .append("rect")
            .attr("class", function(d){
                var regionName = d.Province || d.name;
                return "bars " + regionName.replace(/ /g, "_");            
            })
            // Prevents division by zero errors
            .attr("width", barData.length ? (chartWidth / barData.length - 1) : 0)
            .attr("x", function(d, i){
                return barData.length ? i * (chartWidth / barData.length) : 0;
            })
            .attr("height", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return yScale(parseFloat(d[expressed]));
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            })
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel)
            .style("opacity", 0);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        // Calls updateChart 
        updateChart(bars, barData.length, colorScale);

        // Handles fading in newly created bars
        bars.transition()
            .duration(300)
            .style("opacity", 1);

        // Vertical y-axis
        var yAxis = d3.axisRight()
            .scale(yScale);

        // Places the y-axis
        chart.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + chartWidth + ", 0)")
            .call(yAxis)
            .style("opacity", 0) 
            .transition()
            .duration(300)
            .style("pointer-events", "none")
            .style("opacity", barData.length > 0 ? 1 : 0);
    }

    function createDropdown(csvData){
        // Dropdown html element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            // .style("display", "none") // Hidden until region select
            .on("change", function(){
                changeAttribute(this.value, csvData)
            })
            // .style("opacity", "0");

        // Attribute names/options, also default option
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d })
            .property("selected", function(d){ return d === expressed; });
    };

    function updateChart(bars, n, colorScale){
        // Repositions, sizes and colors the bars
        bars.transition() // ADD THIS
            .duration(300) // ADD THIS
            .attr("x", function(d, i){
            return i * (chartWidth / n);
        })
        .attr("height", function(d){
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d){
            return yScale(parseFloat(d[expressed]));
        })
        .style("fill", function(d){
            var value = d[expressed];
            if(value){
                return colorScale(value);
            } else {
                return "#ccc";
            }
        });

        // Updates the chart title dynamically
        d3.select(".chartTitle")
            .text(expressed + " by Province");
    }

    // Dropdown event handler
    function changeAttribute(attribute, csvData){
        // Changes the expressed attribute
        expressed = attribute;

        // Recreates the color scale
        var colorScale = makeColorScale(csvData);

        // Recolors enumeration units
        var provinces = d3.selectAll(".provinces")
            .style("fill", function(d){ 
                // if (!activeRegion){
                //     var region = d.properties.region;
                //     return regionColors[region] ? regionColors[region] : "#ccc";
                // } 
                
                if (activeRegion && d.properties.region !==activeRegion){
                    return "#ccc";
                }

                var value = d.properties[expressed];
                if (value !== undefined){
                    return colorScale(value);
                } else{
                    return "#ccc";
                }
            });

        // Sort, resize, and recolor bars if the chart exists
        var bars = d3.selectAll(".bars");
        var dataForMax;

        // Check if bars exist to determine the data pool
        if (!bars.empty()){
            // Sort the existing bars
            bars = bars.sort(function(a, b){
                return a[expressed] - b[expressed];
            });
            // Use the regional bar data for the axis max
            dataForMax = bars.data();
        } else {
            // Use the national data for the axis max
            dataForMax = csvData;
        }

        // Update yScale domain based on the selected attribute
        if (expressed.includes("%")){
            yScale.domain([0, 100]);
        } else {
            var max = d3.max(dataForMax, function(d){
                return parseFloat(String(d[expressed]).replace(/,/g, ""));
            });
            yScale.domain([0, max * 1.1]);
        }

        // Updates the y-axis to match the new scale
        d3.select(".axis")
            .transition()
            .duration(300)
            .call(d3.axisRight(yScale))
            .style("opacity", bars.empty() ? 0 : 1);

        // If bars exist, push the new scale/colors to them
        if (!bars.empty()){
            var n = bars.data().length;
            updateChart(bars, n, colorScale);
        }
    };

    function makeColorScale(data){
        var colorClasses;

        // Check if the current attribute is formal
        if (expressed.startsWith("Formal")){
            // Color palette for formal attributes
            colorClasses = [
                "#edf8e9",
                "#c7e9c0",
                "#a1d99b",
                "#74c476",
                "#41ab5d",
                "#238b45",
                "#005a32"
            ];
        } else {
            // Color palette for informal attributes & ratios
            colorClasses = [
                "#fedbcb",
                "#fcaf94",
                "#fc8161",
                "#f44f39",
                "#d52221",
                "#aa1016",
                "#67000d"
            ];
        }

        // Creates the color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        // Builds an array for all the values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(String(data[i][expressed]).replace(/,/g, ""));
            domainArray.push(val);
        };

        colorScale.domain(domainArray);

        return colorScale;
    }

    function setGraticule(map, path){
        // Creates graticules every 5 degrees long/lat
        var graticule = d3.geoGraticule()
            .extent([[80, -5], [150, 500]])
            .step([5, 5]);

        // Creates graticule background
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
                    attrArray.forEach(function(attr){
                        // Clears out commas from the csv formatting
                        var val = parseFloat(String(csvRegion[attr]).replace(/,/g, ""));

                        // Assigns the attribute to the geojson
                        geojsonProps[attr] = val;
                    });
                };
            };
        };

        console.log(thaiProvinces)
        return thaiProvinces
    }

    function setEnumerationUnits(thaiProvinces, map, path, csvData){
        var colorScale = makeColorScale(csvData);

        // Render Thai provinces and apply default region colors
        var provinces = map.selectAll(".provinces")
            .data(thaiProvinces)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "provinces " + d.properties.name.replace(/ /g, "_");
            })
            .attr("d", path)
            // Set initial color based on the region palette
            .style("fill", function(d){
                var value = d.properties[expressed];
                    if (value !== undefined){
                        return colorScale(value);
                    } else {
                        return "#ccc";
                    }
            })
            .style("stroke", "#fff")
            .style("stroke-width", "0.5px")
            .style("cursor", "pointer") // Change mouse to pointer to show it's clickable
            
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel)

            // Region selection event click listener
            .on("click", function(event, d){
                var clickedRegion = d.properties.region;

                // IF: User clicks on already active region; resets province color
                if (activeRegion === clickedRegion){
                    activeRegion = null; // Clear active state

                    var colorScale = makeColorScale(csvData);

                    map.selectAll(".provinces")
                        .transition()
                        .duration(300)
                        .style("fill", function(p){
                            var value = p.properties[expressed];
                                if (value !== undefined){
                                    return colorScale(value);
                                } else {
                                    return "#ccc";
                                }
                        })
                        // Resets highlight stroke when region is deselected
                        .style("stroke", "#fff")
                        .style("stroke-width", "0.5px");

                    zoomMap(activeRegion, map);

                    // Disappears the abstract
                    d3.select(".abstract")
                        // .style("display", "block")
                        .transition()
                        .duration(300)
                        .style("opacity", 1);

                    d3.select(".tutorial")
                        // .style("display", "block")
                        .transition()
                        .duration(300)
                        .style("opacity", 1);

                    // // Fade in & delete chart
                    // d3.select(".chart")
                    //     .transition()
                    //     .duration(300)
                    //     .style("opacity", 0)
                    //     .remove();

                    // Fade in & delete dropdown
                    // d3.select(".dropdown")
                    //     .transition()
                    //     .duration(300)
                    //     .style("opacity", 0)
                    //     .on("end", function(){
                    //         d3.select(this).style("display", "none");
                    //     });

                    // // Hides dynamic label
                    // d3.select(".abstract")
                    //     .transition()
                    //     .duration(1000)
                    //     .style("opacity", 1);

                    d3.select(".infolabel")
                        .remove();

                    // setChart([], csvData, colorScale);

                    // y-axis ticks and bars FADE OUT
                    d3.select(".axis").transition().duration(300).style("opacity", 0);

                    var oldBars = d3.selectAll(".bars");
                    if (!oldBars.empty()){
                        oldBars.transition()
                            .duration(300)
                            .style("opacity", 0)
                            .on("end", function(d, i, nodes){
                                // Fires setChart once the last bar finishes fading
                                if (i === nodes.length - 1){
                                    setChart([], csvData, colorScale);
                                }
                            });
                    } else {
                        setChart([], csvData, colorScale);
                    }
                } 
                // IF: User clicks on a new region; color provinces
                else {
                    activeRegion = clickedRegion; // Set new active state

                    // Applies the colorScale based on the selected attribute
                    var colorScale = makeColorScale(csvData);

                    map.selectAll(".provinces")
                        .transition()
                        .duration(300)
                        .style("fill", function(p){
                            if (p.properties.region === activeRegion){
                                // Loads in the color scheme for the expressed attribute
                                var colorPalette = p.properties[expressed];
                                if (colorPalette){
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
                        .map(function(province){return province.properties;})
                        .filter(function(props){return props.region === activeRegion;})

                        // Reappears the abstract
                        d3.select(".abstract")
                            .transition()
                            .duration(300)
                            .style("opacity", 0)
                            .style("pointer-events", "none")

                        d3.select(".tutorial")
                            .transition()
                            .duration(300)
                            .style("opacity", 0)
                            .style("pointer-events", "none")

                        // y-axis ticks and bars FADE IN
                        d3.select(".axis").transition().duration(300).style("opacity", 0);

                        // d3.select(".abstract")
                        //     .transition()
                        //     .duration(750)
                        //     .style("opacity", 0);

                        // // Chart fade out transition
                        // d3.select(".chart")
                        //     .transition()
                        //     .duration(300)
                        //     .style("opacity", 0)
                        //     .remove();

                        // setChart(regionData, csvData, colorScale);

                        var oldBars = d3.selectAll(".bars");
                            if (!oldBars.empty()){
                                oldBars.transition()
                                    .duration(300)
                                    .style("opacity", 0)
                                    .on("end", function(d, i, nodes){
                                        // Fires setChart once the last bar finishes fading
                                        if (i === nodes.length - 1){
                                            setChart(regionData, csvData, colorScale);
                                        }
                                    });
                            } else {
                                setChart(regionData, csvData, colorScale);
                            }
                        
                        // Dropdown fade out transition
                        // d3.select(".dropdown")
                        //     .style("display", "block")
                        //     .transition()
                        //     .duration(300)
                        //     .style("opacity", 0)
                        //     .transition()
                        //     .duration(750)
                        //     .style("opacity", 1);
                }
            });

        var desc = provinces.append("desc")
            .text('{"stroke": "#fff", "stroke-width": "0.5px"}');
    }

    // Function to handle map zooming
    function zoomMap(activeRegion, map){
        
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
        if (activeRegion === null){
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

    // Highlights enumeration units and bars
    function highlight(props){
        // Cancel the function if no region selected/hovered over
        if (!activeRegion || props.region !== activeRegion) return;

        // Map uses name value and chart uses province value
        var regionName = props.name || props.Province;
        
        // Remove spaces to match classes
        var className = regionName.replace(/ /g, "_");

        // Stroke
        var selected = d3.selectAll("." + className)
            .style("stroke", "blue")
            .style("stroke-width", "2")
            .raise();

        setLabel(props);
    }

    // Resets the highlight element style on mouseout
    function dehighlight(props){
        // Cancel the function if no region selected/hovered over
        if (!activeRegion || props.region !== activeRegion) return;

        var regionName = props.name || props.Province;
        var className = regionName.replace(/ /g, "_");

        var selected = d3.selectAll("." + className)
            .style("stroke", function(){
                // If it's a map province, return white. If it's a chart bar, return none.
                return d3.select(this).classed("provinces") ? "#fff" : "none";
            })
            .style("stroke-width", function(){
                return d3.select(this).classed("provinces") ? "0.5px" : "0px";
            });

        d3.selectAll(".infolabel").remove();
    }

    // Creates dynamic enumeration label
    function setLabel(props){
        var regionName = props.name || props.Province;

        // Destroy pre-existing labels
        d3.selectAll(".infolabel").remove();

        // Label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        // Info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", regionName.replace(/ /g, "_") + "_label")
            .html(labelAttribute)
            .style("z-index", "15")
            .style("font-family", "sans-serif")
            .style("font-weight", "bold")
            .style("background-color", "rgb(255, 255, 255)")
            .style("color", "#333")
            .style("border", "1px solid #999")
            .style("box-shadow", "2px 2px 5px rgba(0, 0, 0, 0.2)")

        var regionNameDiv = infolabel.append("div")
            .attr("class", "labelname")
            .html(regionName);
    }

    // Moves dynamic enumeration label with mouse
    function moveLabel(event){
        // Ensures the label exists before trying to move it
        var label = d3.select(".infolabel");
        if (label.empty()) return;

        // Get width of label
        var labelWidth = label.node().getBoundingClientRect().width;

        // Coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        // Horizontal label coordinate
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        
        // Vertical label coordinate
        var y = event.clientY < 75 ? y2 : y1; 

        label.style("left", x + "px")
             .style("top", y + "px");
    }
})();