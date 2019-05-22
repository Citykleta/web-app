import mapboxgl from 'mapbox-gl';
import mapBoxConf from '../../conf/mapbox';
import registry from '../services/service-registry';
import {id as suggestionsId, slice as suggestionsSlicer, style as suggestionsStyle,} from './suggestions-layer';
import {id as stopsId, slicer as stopsSlicer, style as stopsStyle} from './directions-stops-layer';
import {
    getLayerData as getRoutesPathData,
    sourceId as routesId,
    slicer as routesPathSlicer,
    lineStyle as routeLineStyle,
    pointStyle as routePointStyle
} from './directions-path-layer';
import {
    getLayerData as getAddressLineData,
    id as addressSourceId,
    slicer as addressLineSlicer,
    lineStyle as addressLineStyle,
    pointStyle as addressPointStyle
} from './address-layer';
import {EMPTY_SOURCE, eventuallyUpdate, pointListToFeature} from './utils';

const {accessToken, ...rest} = mapBoxConf;
const {store} = registry;

mapboxgl.accessToken = accessToken;

const map = new mapboxgl.Map({
    container: 'map-container',
    interactive: true,
    ...rest
});

map.on('load', () => {
    map.addSource(suggestionsId, EMPTY_SOURCE);
    map.addLayer(suggestionsStyle);
    map.addSource(routesId, EMPTY_SOURCE);
    map.addLayer(routeLineStyle);
    map.addLayer(routePointStyle);
    map.addSource(stopsId, EMPTY_SOURCE);
    map.addLayer(stopsStyle);
    map.addSource(addressSourceId, EMPTY_SOURCE);
    map.addLayer(addressLineStyle);
    map.addLayer(addressPointStyle);
});

map.on('click', ev => {
    console.log(ev.lngLat);
});

let currentSelectedSuggestion = null;

const mapUpdater = eventuallyUpdate(map);
const updateSuggestions = mapUpdater(suggestionsId, suggestionsSlicer, pointListToFeature);
const updateStopPoints = mapUpdater(stopsId, stopsSlicer, pointListToFeature);
const updateRoutes = mapUpdater(routesId, routesPathSlicer, getRoutesPathData);
const updateAddressLines = mapUpdater(addressSourceId, addressLineSlicer, getAddressLineData);

store.subscribe(() => {
    const newState = store.getState();
    const {selectedSuggestion} = newState.search;

    updateSuggestions(newState);
    updateStopPoints(newState);
    updateRoutes(newState);
    updateAddressLines(newState);

    if (selectedSuggestion !== currentSelectedSuggestion && selectedSuggestion !== null) {
        map.jumpTo({
            center: [selectedSuggestion.lng, selectedSuggestion.lat],
            zoom: Math.max(13.5, map.getZoom())
        });
    }
});




