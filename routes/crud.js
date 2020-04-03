var express = require('express'); 
var pg = require('pg'); 
var crud = require('express').Router(); 
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

crud.route('/testCRUD').get(function (req,res) { 
    res.json({message:req.originalUrl}); 
});


    crud.post('/uploadQuestion',(req,res) => {
            console.dir(req.body);

    pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
      // pull the geometry component together
      // note that well known text requires the points as longitude/latitude !
      // well known text should look like: 'POINT(-71.064544 42.28787)'
        var param1 = req.body.question_title;
        var param2 = req.body.question_text;
        var param3 = req.body.answer_1;
        var param4 = req.body.answer_2;
        var param5 = req.body.answer_3;
        var param6 = req.body.answer_4;
        var param7 = req.body.port_id;
        var param8 = req.body.correct_answer;
     
      // no need for injection prevention for st_geomfromtext as if 
      // the lat/lng values are not numbers it will not process them at all 
      // impossible to run a statement such as st_geomfromtext('POINT(delete from public.formdata')
      var geometrystring = "st_geomfromtext('POINT("+req.body.longitude+ " "+req.body.latitude +")',4326)";
      var querystring = "INSERT into public.quizquestions (question_title,question_text,answer_1,answer_2, answer_3, answer_4,port_id,correct_answer,location) values ";
      querystring += "($1,$2,$3,$4,$5,$6,$7,$8,";
      querystring += geometrystring + ")";
                console.log(querystring);
                client.query( querystring,[param1,param2,param3,param4,param5,param6,param7,param8],function(err,result) {
                done();
                if(err){
                     console.log(err);
                     res.status(400).send(err);
                }
                res.status(200).send("Question Data "+ req.body.question_title+ " has been inserted");
             });
      });
});

crud.post('/deleteQuestionData',(req,res) => {
    console.dir(req.body);
    pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
      var param1 = req.body.port_id ;
      var param2 =  req.body.id ;
      var querystring = "DELETE from public.formdata where id = $1 and port_id = $2";
                console.log(querystring);
                client.query( querystring,[param2,param1],function(err,result) {
                done();
                if(err){
                     console.log(err);
                     res.status(400).send(err);
                }
                res.status(200).send("Question Data with ID "+ param2+ " and port_id "+ param1 + " has been deleted (if it existed in the database)");
             });
      });
});

crud.get('/getQuizPoints/:port_id', function (req,res) {
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
          querystring += "   FROM public.quizquestion As lg ";
         querystring += " where port_id = $1 limit 100  ) As f ";
          console.log(querystring);
          var port_id = req.params.port_id; //
          // run the second query
          client.query(querystring,[port_id],function(err,result){
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

module.exports = crud;