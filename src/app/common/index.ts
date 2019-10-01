import {registry, ServiceRegistry} from './service-registry';
import {withInjector} from './injector';
import {once} from '../utils';
import {provider as searchProvider} from '../search/service';
import {provider} from '../itinerary/service';
import {reducer as itineraryReducer} from '../itinerary/reducer';
import {reducer as searchReducer} from '../search/reducers';
import {SearchBox} from '../search/elements/search-box';
import {LocationSuggestionItem} from '../search/elements/location-suggestion-item';

export const defaultRegistry = registry();
export const defaultInjector = withInjector(defaultRegistry);

export const loadSearchItineraryServices = once((registry: ServiceRegistry, store) => {
    store.injectReducer('itinerary', itineraryReducer);
    store.injectReducer('search', searchReducer);
    registry.set('search', searchProvider(store));
    registry.set('itinerary', provider(store));
});

export const loadSearchItineraryComponents = once(injector => {
    if (!customElements.get('citykleta-search-box')) {
        customElements.define('citykleta-search-box', injector(SearchBox));
        customElements.define('citykleta-location-suggestion', LocationSuggestionItem);
    }
    if (!customElements.get('citykleta-location-suggestion')) {
        customElements.define('citykleta-location-suggestion', LocationSuggestionItem);
    }
});
