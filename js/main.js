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

        // Circle X coordinate
        .attr("cx", function(d, i){
            return 90 + (i * 180);
        })

        // Circle y coordinate
        .attr("cy", function(d){
            return 450 - (d.population * 0.0005);
        });
};