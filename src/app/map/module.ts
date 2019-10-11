import {CircleLayer, GeoJSONSource, GeoMap as MbGeoMap, LineLayer, SymbolLayer} from '@citykleta/mb-gl-comp';
import {ServiceRegistry} from '../common/service-registry';
import {provider} from './service';
import {once} from '../utils';
import {GeoMap} from './elements/map';
import {reducer} from './reducer';
import store from '../store/index';
import {ApplicationState} from '../store/store';
import {define, connect} from '../common';

export const loadServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('map', reducer);
    registry.set('map', provider(store));
});

export const loadComponents = once((injector) => {
    const connectedMap = connect(store, (state: ApplicationState) => {
        return {
            ...state.map,
            view: state.navigation.selectedView,
            applicationState: state
        };
    });
    define('mb-map', MbGeoMap);
    define('mb-geojson', GeoJSONSource);
    define('mb-circle-layer', CircleLayer);
    define('mb-line-layer', LineLayer);
    define('mb-symbol-layer', SymbolLayer);
    define('citykleta-map', connectedMap(injector(GeoMap)));
});
