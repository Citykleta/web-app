import {CircleLayer, GeoJSONSource, GeoMap as MbGeoMap, LineLayer, SymbolLayer} from '@citykleta/mb-gl-comp';
import {ServiceRegistry} from '../common/service-registry';
import {provider} from './service';
import {once} from '../utils';
import {GeoMap} from './elements/map';
import {reducer} from './reducer';
import store from '../store/index';
import {connect} from '../common/connect';
import {ApplicationState} from '../store/store';

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
    customElements.define('mb-map', MbGeoMap);
    customElements.define('mb-geojson', GeoJSONSource);
    customElements.define('mb-circle-layer', CircleLayer);
    customElements.define('mb-line-layer', LineLayer);
    customElements.define('mb-symbol-layer', SymbolLayer);
    customElements.define('citykleta-map', connectedMap(injector(GeoMap)));
});
