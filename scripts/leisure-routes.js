const {readFileSync} = require('fs');
const {resolve} = require('path');
const {encode} = require('@mapbox/polyline');

const truncate = (value, radix = 6) => Math.trunc(value * 10 ** radix) / 10 ** radix;

const vedadoInput = JSON.parse(readFileSync(resolve(process.cwd(), './src/sdk/routes/vedado.geojson')));

const {geometry} = vedadoInput.features[0];
const {coordinates} = geometry;
console.log(encode(coordinates))