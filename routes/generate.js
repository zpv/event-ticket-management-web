const PDFDocument = require('pdfkit')
const blobStream = require('blob-stream')

const express = require('express')
const router = express.Router()

router.get('/get-ticket', function(req, res, next) {
	var doc = new PDFDocument()
	doc.text('test')
	stream = doc.pipe(blobStream())
	doc.end()

	stream.on('finish', function() {
		res.send(stream.toBlob('application/pdf'))
	})
})

module.exports = router