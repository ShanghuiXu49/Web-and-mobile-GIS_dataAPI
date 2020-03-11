// express is the server that forms part of the nodejs program 
var express = require('express'); 
var path = require("path"); 
var app = express(); 
var fs = require('fs'); 

// add an https server to serve files 
var https = require('https'); 
var privateKey = fs.readFileSync('/home/studentuser/certs/cert.key').toString(); 
var certificate = fs.readFileSync('/home/studentuser/certs/cert.crt').toString(); 

var credentials = {key: privateKey, cert: certificate}; 
var httpsServer = https.createServer(credentials, app); 

httpsServer.listen(4480); 

app.get('/',function (req,res) { 
        res.send("hello world from the Data API"); 
});