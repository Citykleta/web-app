import {ServiceRegistry} from '../common/service-registry';
import {once} from '../utils';
import {provider} from './service';
import {GeoMap} from './elements/map';
import {reducer} from './reducer';
import {factory, MapToolBox} from "./map-tool-box";

export const loadServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('map', reducer);
    const toolBox: MapToolBox = factory(store, registry);
    registry.set('map', provider(store, toolBox));
});

export const loadComponents = once((injector) => {
    customElements.define('citykleta-map', injector(GeoMap));
});
