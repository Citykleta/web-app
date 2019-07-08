import {ServiceRegistry} from '../common/service-registry';
import {once} from '../utils';
import {provider} from './service';
import {GeoMap} from './elements/map';
import {reducer} from './reducer';

export const loadServices = once((registry: ServiceRegistry, store) => {

    store.injectReducer('map', reducer);
    registry.set('map', provider(store));
});

export const loadComponents = once((injector) => {
    customElements.define('citykleta-map', injector(GeoMap));
});
