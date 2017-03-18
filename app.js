const path = require('path')  
const express = require('express')  
const exphbs = require('express-handlebars')
const fs = require('fs')

const PDFDocument = require('pdfkit')
const BlobStream = require('blob-stream')

const QRCode = require('qrcode')

const app = express()

app.engine('.hbs', exphbs({  
  defaultLayout: 'main',
  extname: '.hbs',
  layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')  
app.set('views', path.join(__dirname, 'views'))


app.get('/', (request, response) => {  
  response.render('home', {
    name: request.query.code
  })
})

app.get('/get-ticket', (req, res) => {
	var doc = new PDFDocument({
		size: [612.00,310.00]
	})

	var img = QRCode.toDataURL('1234', (err, url) => {
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



app.listen(3000)