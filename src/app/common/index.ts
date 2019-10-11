import {registry, ServiceRegistry} from './service-registry';
import {withInjector} from './injector';
import {once} from '../utils';
import {provider as searchProvider} from '../search/service';
import {provider} from '../itinerary/service';
import {reducer as itineraryReducer} from '../itinerary/reducer';
import {reducer as searchReducer} from '../search/reducers';

/** application registry */
export const defaultRegistry = registry();

/** application injector */
export const defaultInjector = withInjector(defaultRegistry);

export {connect} from './connect';

export const define = (tagName: string, component) => {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, component);
    }
};

export const loadSearchItineraryServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('itinerary', itineraryReducer);
    store.injectReducer('search', searchReducer);
    registry.set('search', searchProvider(store));
    registry.set('itinerary', provider(store));
});