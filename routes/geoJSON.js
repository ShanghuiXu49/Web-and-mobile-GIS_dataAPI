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

module.exports = geoJSON;