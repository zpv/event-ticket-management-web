const path = require('path')  
const express = require('express')  
const exphbs = require('express-handlebars')
const fs = require('fs')

const async = require('async');
const pg = require('pg');

const PDFDocument = require('pdfkit')
const BlobStream = require('blob-stream')

const QRCode = require('qrcode')

const app = express()

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

app.engine('.hbs', exphbs({  
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')  
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (request, response) => {  
  response.render('home', {
    name: request.query.code
  })
})

app.get('/get-ticket', (req, res) => {
	var doc = new PDFDocument({
		size: [612.00,310.00]
	})

	var img = QRCode.toDataURL('CODElol your ticket sucks', (err, url) => {
		doc.fontSize(25).text('Name: John Smith', 100, 80);
		doc.image(url)
		doc.end()
		var stream = doc.pipe(res)

		stream.on('finish', function(){
			console.log('PDF Closed')
		})
	})

	
	//doc.image(img)

})

app.get('/scan-ticket', (req, res) => {
	var id = req.query.code

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

	  var query = client.query('SELECT * FROM tickets WHERE code=\'' + id +'\'')



	  query.on('end', (result) => {
	  	ticket = result.rows[0];
	  	finish();
	  	
		var results = {};
		if(ticket) {
		  	if(ticket.used){
		  		results.response = 0
		  		results.msg = "Ticket has already been used."
		  	} else {
		  		results.response = 1
		  		results.msg = "Ticket has been successfully registered."

		  	}
		  } else {
		  	results.response = 0
		  	results.msg = "Ticket does not exist."
		  }

	      return res.json(results);
	    }
      );
	  
	})}})


app.listen(3000)