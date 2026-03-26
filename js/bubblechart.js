window.onload = function(){

    // Width and Height for container
    var w = 900, h = 500;

    var container = d3.select("body") // Gets the body element
        .append("svg") // Adds an SVG element to the body
        .attr("width", w)
        .attr("height", h)
        .attr("class", "container") // Class name
        .style("background-color", "rgba(0,0,0,0.2)"); //svg background color

    var innerRect = container.append("rect")
        .datum(400)
        .attr("width", function(d){ // Rectangle width
            return d * 2;
        })
        .attr("height", function(d){ // Rectangle height
            return d;
        })
        .attr("class", "innerRect") // Class name
        .attr("x", 50) // Position from the left, horizontal axis
        .attr("y", 50) // Position from the top, vertical axis
        .style("fill", "#FFFFFF");

    // Preliminary city data
    var cityPop = [
        { 
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    // Scale for circle center x coordinate
    var x = d3.scaleLinear() 
        .range([90, 810]) // Output min and max
        .domain([0, 3]); // Input min and max

    // Minimum population value of in the CityPop array
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    // Maximum population value of in the CityPop array
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    // Scale for circle center y coordinate
    var y = d3.scaleLinear()
        .range([450, 50])
        .domain([0, 700000]);

    // Color ramp
    var color = d3.scaleLinear()
        .range([
            "#FDBE85",
            "#D94701"
        ])

        .domain([
            minPop, 
            maxPop
        ]);
        
    var cityCircles = container.selectAll(".circles")        
        .data(cityPop) // Feeds the cityPop array
        .enter() // Joins the cityPop array
        .append("circle")
        .attr("class", "cityCircles")

        // City name
        .attr("id", function(d){
            return d.city;
        })

        // City circle radius
        .attr("r", function(d){
            var area = d.population * 0.01;
            console.log(d.city + ": " + d.population);
            return Math.sqrt(area/Math.PI);
        })

        // Uses the scale generator to position circles horizontally
        .attr("cx", function(d, i){
            return x(i);
        })

        // Uses the scale generator to position circles vertically
        .attr("cy", function(d){
            return y(d.population);
        })

        .style("fill", function(d, i){
            return color(d.population);
        })

        .style("stroke", "#000");

    var yAxis = d3.axisLeft(y);

    // Rotates the axis by 50 pixels to the right
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);

    // Title
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("Wisconsin City Populations");

    // Creates cityCircles labels
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            // Vertical position centered on each circle
            return y(d.population) + 5;
        });

    // First line of cityCircles labels
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            // Horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

    var format = d3.format(",");

    // Second line of cityCircles labels
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") // Vertical offset
        .text(function(d){
            return "Pop. " + format(d.population);
        });
        
    yAxis(axis);
};