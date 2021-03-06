  
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

// Code to see answers uploaded in the database
geoJSON.get('/getQuizAnswer/:port_id', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
          // note that query needs to be a single string with no line breaks so built it up bit by bit
         var querystring = "  SELECT * FROM public.quizanswers";
         querystring += " where port_id = $1";
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

// Code to see all answers uploaded in the database (for testing purpose only)
geoJSON.get('/getQuizAnswers', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
          // note that query needs to be a single string with no line breaks so built it up bit by bit
          // run the second query
          client.query('SELECT * FROM public.quizanswers',function(err,result){
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

//Get Correct Answers Number
geoJSON.get('/getCorrectAnswer/:port_id', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
         var querystring = "SELECT COUNT(*) AS num_questions from public.quizanswers where (answer_selected = correct_answer) and port_id = $1";
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
             res.status(200).send(result.rows[0]["num_questions"]);
        });
    });

});


// Code to get the user's rank
geoJSON.get('/getRanking/:port_id', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
         var querystring = "select c.rank from (SELECT b.port_id, rank()over (order by num_questions desc) as rank from (select COUNT(*) AS num_questions, port_id from public.quizanswers where answer_selected = correct_answer group by port_id) b) c where c.port_id = $1";
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
            res.status(200).send(result.rows[0]["rank"]);
        });
    });

});


// code to get the top 5 scorers in the database
geoJSON.get('/getTop5Scorers', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
        var querystring = "select array_to_json (array_agg(c)) from (select rank() over (order by num_questions desc) as rank , port_id from (select COUNT(*) AS num_questions, port_id from public.quizanswers where answer_selected = correct_answer group by port_id) b limit 5) c";
          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
          // note that query needs to be a single string with no line breaks so built it up bit by bit
          // run the second query
          client.query(querystring,function(err,result){
            //call `done()` to release the client back to the pool
            done();
            if(err){
                  console.log(err);
                  res.status(400).send(err);
             }
            res.status(200).send(result.rows[0]);
        });
    });

});


// Code to get daily participation rates for my user id only
geoJSON.get('/getParticipationRateMyUser/:port_id', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
         var querystring = "select array_to_json (array_agg(c)) from (select * from public.participation_rates where port_id = $1) c";
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
            res.status(200).send(result.rows[0]);
        });
    });

});


// Code to get daily participation rates for all user id
geoJSON.get('/getParticipationRateAllUser', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
         var querystring = "select  array_to_json (array_agg(c)) from (select day, sum(questions_answered) as questions_answered, sum(questions_correct) as questions_correct from public.participation_rates group by day) c ";
          console.log(querystring);
          // run the second query
          client.query(querystring,function(err,result){
            //call `done()` to release the client back to the pool
            done();
            if(err){
                  console.log(err);
                  res.status(400).send(err);
             }
            res.status(200).send(result.rows[0]);
        });
    });

});

//Code to get the quiz points added in the last week for all users
geoJSON.get('/getLastWeekPoints', function (req,res) {
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
          var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM";
          querystring += "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, ";
          querystring += "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, answer_4, port_id, correct_answer) As l      )) As properties";
          querystring += "   FROM public.quizquestions  As lg where timestamp > NOW()::DATE-EXTRACT(DOW FROM NOW())::INTEGER-7  limit 100  ) As f";
          console.log(querystring);
          // run the second query
          client.query(querystring,function(err,result){
            //call `done()` to release the client back to the pool
            done();
            if(err){
                  console.log(err);
                  res.status(400).send(err);
             }
            res.status(200).send(result.rows [0]);
        });
    });

});


//Code to get 5 closest question points to the user loaction
geoJSON.get('/getClosest5Points/:lng/:lat', function (req,res) {
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
         var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features";
         querystring += "  FROM (SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry,";
         querystring += " row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, answer_4, port_id, correct_answer) As l )) As properties";
         querystring += " FROM   (select c.* from public.quizquestions c inner join (select id, st_distance(a.location, st_geomfromtext('POINT("+req.params.lng+" "+req.params.lat+")',4326)) as distance";
         querystring += " from public.quizquestions a order by distance asc limit 5) b on c.id = b.id ) as lg) As f";

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

geoJSON.get('/getDifficultQuestions', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
          var querystring = "select array_to_json (array_agg(d)) from (select c.* from public.quizquestions c inner join (select count(*) as incorrectanswers, question_id from public.quizanswers where answer_selected <> correct_answer group by question_id order by incorrectanswers desc limit 5) b on b.question_id = c.id) d";
          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
          // note that query needs to be a single string with no line breaks so built it up bit by bit

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

})

//code to get the last 5 question that the user answered
geoJSON.get('/getLast5Question/:port_id', function (req,res) {
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
          querystring += "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, answer_4, port_id, correct_answer, answer_correct) As l      )) As properties";
          querystring += " FROM (select a.*, b.answer_correct from public.quizquestions a inner join ";
      querystring += " (select question_id, answer_selected=correct_answer as answer_correct from public.quizanswers";
      querystring += " where port_id = $1 order by timestamp desc limit 5) b on a.id = b.question_id) as lg) As f";
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

geoJSON.get('/getUnanswered/:port_id', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }
          var colnames = "id, question_title, question_text, answer_1,";
          colnames = colnames + "answer_2, answer_3, answer_4, port_id, correct_answer";

          var param1 = req.params.port_id;
          var param2 = req.params.port_id;
          // now use the inbuilt geoJSON functionality
          // and create the required geoJSON format using a query adapted from here:
          // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
          // note that query needs to be a single string with no line breaks so built it up bit by bit
          var querystring = " SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
          querystring += "(SELECT 'Feature' As type     , ST_AsGeoJSON(lg.location)::json As geometry, ";
          querystring += "row_to_json((SELECT l FROM (SELECT id, question_title, question_text, answer_1, answer_2, answer_3, answer_4, port_id, correct_answer) ";
          querystring += "As l )) As properties"
          querystring += "  FROM (select * from public.quizquestions where id in (select question_id from public.quizanswers where port_id = $1 and ";
          querystring += "answer_selected <> correct_answer union all select id from public.quizquestions where id not in ";
          querystring += "(select question_id from public.quizanswers) and port_id = $2) ) as lg) As f";
          console.log(querystring);
           //
          // run the second query
          client.query(querystring,[param1,param2],function(err,result){
            //call `done()` to release the client back to the pool
            done();
            if(err){
                  console.log(err);
                  res.status(400).send(err);
             }
            res.status(200).send(result.rows);
        });
    });

})

    module.exports = geoJSON;