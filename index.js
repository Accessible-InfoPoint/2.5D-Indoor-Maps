/* eslint-disable @typescript-eslint/no-var-requires */
/**
  MIT License

  Copyright (c) Richard Fuchs, Danny Schober, Jacques-Maurice Walther

  Copyright for portions of the project are held by 2023 AccessibleMaps Project and Julian Striegl as part of project Mapable. All other copyright for the project are held by the above mentioned.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

  Developed by: Richard Fuchs, Danny Schober, Jacques-Maurice Walther
*/

const express = require('express');
const path = require('path');
const getOverpassData = require("./server/_getOverpassData");
const createPatternFillImages = require("./server/_createPatternFillImages");

const app = express();
const port = 3000;

createPatternFillImages();
getOverpassData().then(() => {
  console.log('=== Starting web server ===');
  app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`)
  })
  app.use(express.static(path.join(__dirname, 'public')));
  
  app.use(express.json());
}).catch(reason => {
  console.error('### Error: '+ reason + ' ###');
})
