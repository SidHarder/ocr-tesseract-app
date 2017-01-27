'use strict'

var util = require('util')
var Tesseract = require('tesseract.js')
var fs = require('fs')
var path = require('path')

var handlebars = require('Handlebars')
var handlebarsIntl = require('handlebars-intl')
handlebarsIntl.registerWith(handlebars)

var wordsOfInterest = ['NAME', 'SEX', 'CITY', 'EMPLOYMENT']

var scannedFileDir = 'd:/git/ocr/scanned/'
var processedFileDir = 'd:/git/ocr/processed/'
var resultFileDir =  'd:/git/ocr/result/'
var htmlFileDir =  'd:/git/ocr/html/'

processScannedFiles()
//extractProcessedFiles()
//buildItemHTML()
//buildListHTML()

function buildItemHTML() {
  fs.readdir(resultFileDir, (err, files) => {
    files.forEach(file => {
      fs.readFile(resultFileDir + file, (err, data) => {
        var extractedData = JSON.parse(data.toString())
        extractedData.fileName = file
        extractedData.imagePath = scannedFileDir + path.parse(file).name + '.png'
        var source = fs.readFileSync('./ocritem.handlebars')
        var template = handlebars.compile(source.toString())
        var result = template(extractedData)
        var htmlFileName = './html/' + path.parse(file).name + '.html'
        fs.writeFile(htmlFileName, result, function () {
          console.log('OCR.html Saved!')
        })
      })
    })
  })
}

function buildListHTML() {
  var htmlFileList = {
    items: []
  }

  fs.readdir(htmlFileDir, (err, files) => {
    files.forEach(file => {
      htmlFileList.items.push({link: htmlFileDir + file, fileName: file})
    })

    var source = fs.readFileSync('./ocrlist.handlebars')
    var template = handlebars.compile(source.toString())
    var result = template(htmlFileList)
    fs.writeFile('./html/ocrlist.html', result, function () {
      console.log('OCR.html Saved!')
    })

  })
}

function extractProcessedFiles() {
  fs.readdir(processedFileDir, (err, files) => {
    files.forEach(file => {
      var processedFileName = processedFileDir + file
      fs.readFile(processedFileName, (err, data) => {
        var processedResult = JSON.parse(data)
        buildLineArray(processedResult, (lines) => {
          var resultObject = {}
          extractPatientName(lines, resultObject, function (resultObject) {
            var resultFileName = 'd:/git/ocr/result/' + path.parse(processedFileName).name + '.json'
            var resultFileData = JSON.stringify(resultObject)
            fs.writeFile(resultFileName, resultFileData, function () {
              console.log('Saved: ' + resultFileName)
            })
          })
        })
      })
    })
  })
}

function processScannedFiles() {
  fs.readdir(scannedFileDir, (err, files) => {
    files.forEach(file => {
      var scannedFileName = scannedFileDir + file
      Tesseract.recognize(scannedFileName)
         .progress(function (p) { console.log('progress', p) })
         .then(function (result)
         {
           var cache = []
           var x = JSON.stringify(result, function(key, value) {
             if (typeof value === 'object' && value !== null) {
               if (cache.indexOf(value) !== -1) {
                 return
               }
               cache.push(value)
             }
              return value
            })
            cache = null

            var processedFileName = processedFileDir + path.basename(scannedFileName, 'png') + 'json'
            fs.writeFile(processedFileName, x, function (err) {
              console.log('Saved processed filename: ' + processedFileName)
            })
         })
    })
  })
}

function saveExtraction(extractedObject, imageFileName) {
  var parsedPath = path.parse(imageFileName)
  var pngPath = 'd:/git/ocr/result/' + parsedPath.name + '.json'
  var fileData = JSON.stringify(extractedObject)
  fs.writeFile(pngPath, fileData, function () {
    console.log('Saved: ' + pngPath)
  })
}

function buildLineArray(recognizerResult, cb) {
  var foundWords = [];
  var lines = [];

  recognizerResult.blocks.forEach(block => {
    block.paragraphs.forEach(paragraph => {
      paragraph.lines.forEach(line => {
        var thisLine = {
          words: []
        }
        line.words.forEach(word => {
          var word = {
            text: word.text,
            confidence: word.confidence
          }
          thisLine.words.push(word)
        })
        lines.push(thisLine)
      })
    })
  })
  cb(lines)
}

function extractPatientName(lines, result, cb) {
  getWordsBetween(lines, 'NAME:', 'PATIENT', function (words) {
    result.firstname = { text: words[0].text, confidence: words[0].confidence }
    if(words.length == 2) {
      result.lastname = { text: words[1].text, confidence: words[1].confidence }
    } else if(words.length == 3) {
      result.middleinitial = { text: words[1].text, confidence: words[1].confidence }
      result.lastname = { text: words[2].text, confidence: words[2].confidence }
    } else if(words.length == 4) {
      result.middleinitial = { text: words[1].text, confidence: words[1].confidence }
      var compoundLastName = words[2].text + ' ' + words[3].text
      var compoundLastNameConfidence = words[3].confidence + '/' + words[3].confidence
      result.lastname = { text: compoundLastName, confidence: compoundLastNameConfidence}
    }
  })
  cb(result)
}

function getWordsBetween(lines, startWord, lastWord, cb) {
  var foundFirstWord = false
  var foundLastWord = false
  var result = []
  lines.some(function (line, index, _ary) {
    line.words.some(function (word, index, _ary) {
      if(foundFirstWord == false) {
        if(word.text == startWord) {
          foundFirstWord = true
        }
      } else {
        if(word.text == lastWord) {
          foundLastWord = true
        } else {
          result.push(word)
        }
      }
      return foundLastWord
    })
    return foundLastWord
  })
  cb(result)
}
