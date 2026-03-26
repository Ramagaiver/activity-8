window.onload = setMap;

function setMap(){

    // Asynchronously loads all data
    var promises = [d3.csv("data/FORMAL vs INFORMAL Employment in Thailand 2024 by Province.csv"),                    
                    d3.json("data/Countries.topojson"),                    
                    d3.json("data/Provinces2.topojson")                   
                    ];    
        Promise.all(promises).then(callback);    

        // Gets the data
        function callback(data){    
            csvData = data[0];    
            asia = data[1];    
            thailand = data[2];
            console.log(csvData);
            console.log(asia);
            console.log(thailand);    

            // TopoJson -> GeoJson
            var asianCountries = topojson.feature(asia, asia.objects.Countries),
                thaiProvinces = topojson.feature(thailand, thailand.objects.Provinces2);

            console.log(asianCountries);
            console.log(thaiProvinces);
        };
};