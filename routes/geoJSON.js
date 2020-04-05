  
    var express = require('express');
    var pg = require('pg');
  var geoJSON = require('express').Router();
    var fs = require('fs');

    var configtext = ""+fs.readFileSync("/home/studentuser/certs/postGISConnection.js");

    // now convert the configruation file into the correct format -i.e. a name/value pair array
    var configarray = configtext.split(",");
    var config = {};
    for (var i = 0; i < configarray.length; i++) {
        var split = configarray[i].split(':');
        config[split[0].trim()] = split[1].trim();
    }
    var pool = new pg.Pool(config);
    console.log(config);

    geoJSON.route('/testGeoJSON').get(function (req,res) {
        res.json({message:req.originalUrl});
    });

    geoJSON.get('/postgistest', function (req,res) {
    pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
           client.query('SELECT name FROM london_counties' ,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           });
        });
    });

     geoJSON.get('/getPOI', function (req,res) {
    pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
            var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
            querystring = querystring + "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.geom)::json As geometry, ";
            querystring = querystring + "row_to_json((SELECT l FROM (SELECT id, name, category) As l      )) As properties";
            querystring = querystring + "   FROM london_poi  As lg limit 100  ) As f"; 

           client.query(querystring,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           });
        });
    });


geoJSON.get('/getGeoJSON/:tablename/:geomcolumn', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        } 

        var colnames = "";

        // first get a list of the columns that are in the table 
        // use string_agg to generate a comma separated list that can then be pasted into the next query
        var tablename = req.params.tablename;
        var geomcolumn = req.params.geomcolumn;
        var querystring = "select string_agg(colname,',') from ( select column_name as colname ";
        querystring = querystring + " FROM information_schema.columns as colname ";
        querystring = querystring + " where table_name   =$1";
        querystring = querystring + " and column_name <> $2 and data_type <> 'USER-DEFINED') as cols ";

            console.log(querystring);
            
            // now run the query
            client.query(querystring,[tablename,geomcolumn], function(err,result){
              if(err){
                console.log(err);
                    res.status(400).send(err);
            }
            thecolnames = result.rows[0].string_agg;
            colnames = thecolnames;
            console.log("the colnames "+thecolnames);

            // now use the inbuilt geoJSON functionality
            // and create the required geoJSON format using a query adapted from here:  
            // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
            // note that query needs to be a single string with no line breaks so built it up bit by bit


            var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
            querystring = querystring + "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg." + req.params.geomcolumn+")::json As geometry, ";
            querystring = querystring + "row_to_json((SELECT l FROM (SELECT "+colnames + ") As l      )) As properties";
            
            // depending on whether we have a port number, do differen things
            if (req.params.portNumber) {
                querystring = querystring + "   FROM "+req.params.tablename+"  As lg where lg.port_id = '"+req.params.portNumber + "' limit 100  ) As f ";
            }
            else {
                querystring = querystring + "   FROM "+req.params.tablename+"  As lg limit 100  ) As f ";
            }
            console.log(querystring);

            // run the second query
            client.query(querystring,function(err,result){
              //call `done()` to release the client back to the pool
            done(); 
            if(err){    
                            console.log(err);
                    res.status(400).send(err);
             }
            res.status(200).send(result.rows);
        });
        
        });
    });
});


     geoJSON.get('/getQuestionData/:port_id', function (req,res) {
        pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
          var colnames = "id, question_title, question_text, answer_1,";
          colnames = colnames + "answer_2, answer_3, answer_4, port_id, correct_answer";
          console.log("colnames are " + colnames);

          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018

          // note that query needs to be a single string with no line breaks so built it up bit by bit
          var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
          querystring += "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, ";
          querystring += "row_to_json((SELECT l FROM (SELECT "+colnames + " ) As l      )) As properties";
          querystring += "   FROM public.quizquestions As lg ";
          querystring += " where port_id = $1 limit 100  ) As f "; 
          console.log(querystring);

           var port_id = req.params.port_id;//

           // run the second query
           client.query(querystring,[port_id],function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           });
        });
    });

    module.exports = geoJSON;