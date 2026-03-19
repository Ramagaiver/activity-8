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

    console.log(innerRect);

};