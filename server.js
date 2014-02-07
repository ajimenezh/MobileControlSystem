var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    request = require('request'),
    util = require('util'),
    http = require('http'),
    port = process.env.PORT || 5000,
    crypto = require('crypto')
;

var fs = require('fs');

app.configure(function(){
  app.engine('html', require('ejs').renderFile);
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(app.routes);
  app.use(express.static(__dirname + '/public'));
  app.use(express.static(__dirname + '/views'));
  app.use(express.static(__dirname + '/'));
  app.use('/public', express.static('public'));
  app.use('/public/zxcvbn', express.static('node_modules/zxcvbn/zxcvbn'));
});



io.sockets.on('connection', function(socket){

  console.log("--- io.sockets.on connection");

  socket.on('login', function(data){
    io.sockets.emit('logon'+data.user);
  });

  socket.on('accept_connection', function(data){
    io.sockets.emit('connection_accepted'+data.user);
  });

  socket.on('close_session', function(data){
    io.sockets.emit('connection_closed'+data.user);
  });
});

var userName = "TestUser";
var password = "TestUser";

var allHash = [];
var users = [];

app.get('/', function(req,res){
  if (typeof req.session.user=="undefined" || !req.session.user) {
    res.redirect('/login');
  }
  else {
    res.render('home.html', {
      state: "waiting",
      user: req.session.user.name
    });
  }
});

app.post('/', function(req, res) {
  req.session.user = null;
  res.redirect('/');
});

app.get('/login', function(req,res){
  res.render('login.html');
});

app.post('/login', function(req, res){
  var user = req.body.user;
  //if (user.name!=userName) {
  //  res.redirect('/login');
  //}
  //else {
  //  if (user.password!=password) {
  //    res.redirect('/login');
  //  }
  //  else {
      req.session.user = user;
      req.session.user.permission = false;
      res.redirect('/');
  //  }
  //}
});

app.get('/signup', function(req,res){
  res.render('signup.html');
});

app.post('/signup', function(req, res){
  var user = req.body.user;
  var date = new Date();
  var time = date.getTime();
  allHash.push({'time': time, 'user': user.name});
  res.render('qr.html',{
    url: 'http://192.168.1.34:5000/qr/' + time
  });
});

function findHash(hash, callback) {
    var x = 0;
    console.dir(allHash.length);
    console.dir(hash);
    for (var i=0; i<allHash.length; i++) {
        console.dir(allHash[i]);
        if (allHash[i].time==hash) {
            callback(null, allHash[i].user);
            i = allHash.length;
            x = -1;
        }
        x++;
        if (x==allHash.length) callback(null, null);
    }  
};

app.get('/qr/:hash', function(req,res) {
    var hash = req.route.params.hash;
    findHash(hash, function(error, result){
       if (error) console.dir("ERROR");
       else {
           if (result) {
                var cipher = crypto.createCipher('aes-256-cbc','SuperSecureKey');
                var crypted = cipher.update(result,'utf8','hex');
                crypted += cipher.final('hex');
                res.render('createCookie.html',{
                   password: crypted 
                });
           }
           else {
               res.render('error1.html');
           }
       }
    });
});

app.get('/mobile', function(req, res) {
  var hash = req.cookies.hash;
  var decipher = crypto.createDecipher('aes-256-cbc','SuperSecureKey');
  decipher.update(hash,'hex','utf8');
  var dec = decipher.final('utf8');
  console.dir(dec);
  res.render('confirm.html', {
    user: dec
  });
});

server.listen(port);
