import mapboxgl from 'mapbox-gl';

const accessToken = 'pk.eyJ1IjoibG9yZW56b2ZveCIsImEiOiJjanFwYWs3NXAyeG94NDhxanE5NHJodDZvIn0.hSLz7F4CLkY5jOdnf03PEw';
const style = 'mapbox://styles/lorenzofox/cjrryj82s4yyl2snsv6sixrxb';

mapboxgl.accessToken = accessToken;

const map = new mapboxgl.Map({
    container: 'map-container',
    style,
    center: [-82.367408, 23.122419],
    zoom: 12.4
});
