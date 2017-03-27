const path = require('path')  
const express = require('express')  
const exphbs = require('express-handlebars')
const fs = require('fs')
const bodyParser = require('body-parser')

const async = require('async');
const pg = require('pg');

const PDFDocument = require('pdfkit')
const BlobStream = require('blob-stream')

const QRCode = require('qrcode')

const app = express()

var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

const session = require('express-session')  
const RedisStore = require('connect-redis')(session)

var config = {
  user: 'nwhacks',
  host: '35.161.247.157',
  database: 'event',
  port: 26257
};

var randomString = function(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

app.use(session({  

  secret: 'bigsecret',
  resave: false,
  saveUninitialized: false
}))

app.engine('.hbs', exphbs({  
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')  
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')))
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

const user = {  
  username: 'steven',
  password: 'test',
  id: 1
}

passport.use(new LocalStrategy(
  function(username, password, done) {
    findUser(username, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (password !== user.password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));



app.use('/', (req, res, next) => {
	pg.connect(config, function (err, client, done) {
		var finish = function () {
			done();
			next();
		};

		if (err) {
			console.error('could not connect to cockroachdb', err);
			finish();
		}

		var query = client.query('SELECT * FROM events')


		query.on('end', (result) => {
			result.rows.forEach(function(i){
				console.log(i)
				i.price = ((i.price/100).toFixed( 2 ))
				console.log(i.price)
			})
			req.events = result.rows;
		})

		query = client.query('SELECT * FROM tickets ORDER BY name')


		query.on('end', (result) => {
			req.tickets = result.rows;
			finish();
		})
	})
})

app.get('/', (req, res) => {  

	res.render('home', {
		id: req.query.id,
		events: req.events,
		title: 'LitTix - Local Events',
		active: {home: true}
	})
})

app.get('/login', (req, res) => {  
	if(req.isAuthenticated())
		res.redirect('/')
	res.render('login', {
		title: 'LitTix - Login'
	})
})

app.post('/login', passport.authenticate('local', { successRedirect: '/',
                                                    failureRedirect: '/login',
                                                    failureFlash: true }));


app.get('/get-events', (req, res) => {
	res.json(req.events)
})

app.get('/get-tickets', (req, res) => {
	res.json(req.tickets)
})
/*
app.get('/clear-tickets', (req, res) => {
	pg.connect(config, function (err, client, done) {
		var finish = function () {
			done();
			res.json({'complete': true})
		};

		if (err) {
			console.error('could not connect to cockroachdb', err);
			finish();
		}


		query = client.query('TRUNCATE TABLE event.tickets')


		query.on('end', (result) => {
			finish();
		})
	})
})*/

app.get('/purchase-tickets', (req, res) => {  
	var e = req.events.find(function(s){
		return s.id == req.query.id
	})

	console.log(e)
	res.render('purchase', {
		event: e,
		title: 'LitTix - Purchase ' + e.name + ' tickets'
	})
})

app.get('/get-ticket', (req, res) => {
	var id = req.query.id

	console.log(id)
	if (!id || isNaN(id)){
		return res.json({'response':0,
						 'msg': "sad react only - no id"})}

	pg.connect(config, function (err, client, done) {


		console.log("connecting wow")
		var finish = function () {
			done();
		};

		if (err) {
			console.error('could not connect to cockroachdb', err);
			finish();
		}
	var code = randomString(8)
		var e = req.events.find(function(s){
		return s.id == id
	})

	if ((typeof e) === 'undefined')
		return res.json({'response':0,
						 'msg': "sad react only - null event"})

	var query = client.query('INSERT INTO event.tickets (eventID, code, name, used) VALUES($1, $2, $3, $4)',
		[req.query.id, code, req.query.name, false])

	query.on('end', (result) => {

	var doc = new PDFDocument({
		size: [612.00,240.00],
		margin: 0
	})



	var date = new Date(0);
	date.setUTCSeconds(e.date)

	var img = QRCode.toDataURL('CODE' + code, (err, url) => {
		doc.info.Title = e.name + " Printable Ticket - " + req.query.name 
		doc.image('public/img/diner.jpg', 0, 0, {
		   fit:[700,243]
		});
		
		doc.image(url, 455, 45, {
			fit: [150, 150]
		})
		//doc.save()
		//doc.save()
		doc.font('public/fonts/OpenSans-Bold.ttf').fontSize(12).text('Ticketholder: ' + req.query.name, 65, 150, {
			align: 'center',
			width: 400
		})
		//doc.restore()
		//doc.font('public/fonts/OpenSans-Bold.ttf').fontSize(25).text('Ticketholder: ' + req.query.name)
		//doc.restore()
		//.text(e.name, 40, 30)
   		//.text('Date: ' + date.toLocaleString())
   		//

   		//doc.font('public/fonts/OpenSans-Regular.ttf').fontSize(18).text('Admit one - General Admission', 200, 180)


		doc.end()
		var stream = doc.pipe(res)
		var stream2 = doc.pipe(fs.createWriteStream('public/tickets/' + req.query.name.split(' ').join('_')	 + '-' + e.name.split(' ').join('_') + ' ' + code + '.pdf'))

		stream.on('finish', function(){
			console.log('PDF Closed')
		})
	})

	finish();

	
	//doc.image(img)

})})})

app.post('/scan-ticket', (req, res) => {
	var id = req.body.code

	console.log(id)
	if (!id){
		return res.json({'response':0,
						 'msg': "No ticket ID entered."})
	} else {
		pg.connect(config, function (err, client, done) {


	  console.log("connecting")
	  var finish = function () {
	    done();
	  };

	  if (err) {
	    console.error('could not connect to cockroachdb', err);
	    finish();
	  }

	  var query = client.query('SELECT * FROM tickets WHERE code=$1',[id])



	  query.on('end', (result) => {
	  	ticket = result.rows[0];
	  	
	  	
		var results = {};
		if(ticket) {
		  	if(ticket.used){
		  		results.response = 2
		  		results.msg = "Ticket has already been used."

		  	} else {
		  		results.response = 1
		  		results.msg = "Ticket has been successfully registered."
		  		results.name = ticket.name;
		  		client.query('UPDATE tickets SET used=true WHERE code=$1',[id])
		  	}
		  } else {
		  	results.response = 0
		  	results.msg = "Ticket does not exist."

		  }
		  finish();
	      return res.json(results);
	    }
      );
	  
	})}})


app.listen(3000)