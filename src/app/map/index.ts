import mapboxgl from 'mapbox-gl';
import mapBoxConf from '../../conf/mapbox';
import registry from '../services/service-registry';
import {
    getLayerData as getRoutesPathData,
    lineStyle as routeLineStyle,
    slicer as routesPathSlicer,
    sourceId as routesId
} from './directions-layer';
import {
    getLayerData as getSuggestionsData,
    lineStyle as suggestionsLineStyle,
    pointStyle as suggestionsPointLayer,
    slicer as suggestionsSlicer,
    sourceId as suggestionsSourceId
} from './suggestions-layer';
import {EMPTY_SOURCE, eventuallyUpdate} from './utils';
import {createSearchResultInstance} from '../elements/search/search-result';

const {accessToken, ...rest} = mapBoxConf;
const {store, mapTools} = registry;

mapboxgl.accessToken = accessToken;


const map = new mapboxgl.Map({
    container: 'map-container',
    interactive: true,
    ...rest
});

map.on('load', () => {
    map.addSource(routesId, EMPTY_SOURCE);
    map.addSource(suggestionsSourceId, EMPTY_SOURCE);
    map.addLayer(routeLineStyle);
    map.addLayer(suggestionsLineStyle);
    map.addLayer(suggestionsPointLayer);
});

map.on('click', 'suggestions-point', ev => {
    console.log(ev);
    console.log(ev.features);
});

map.on('click', ev => {
    // console.log(map.queryRenderedFeatures(ev.lngLat.toArray()));
    mapTools.actionClick(ev.lngLat);
    // new mapboxgl.Marker()
    //     .setLngLat(ev.lngLat)
    //     .addTo(map);

});

const mapUpdater = eventuallyUpdate(map);
const updateRoutes = mapUpdater(routesId, routesPathSlicer, getRoutesPathData);
const updateSuggestions = mapUpdater(suggestionsSourceId, suggestionsSlicer, getSuggestionsData);

store.subscribe(() => {
    const newState = store.getState();
    const {selectedSearchResult} = newState.search;

    updateRoutes(newState);
    updateSuggestions(newState);

    if (selectedSearchResult !== null) {
        const center = createSearchResultInstance(selectedSearchResult).toPoint();
        map.jumpTo({
            center: [center.lng, center.lat],
            zoom: Math.max(15.5, map.getZoom())
        });
    }
});




