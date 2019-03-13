import {ItineraryService, provider as itineraryProvider} from './itinerary';
import {NavigationService, provider as navigationProvider} from './navigation';
import {MapToolService, provider as mapToolProvider} from './map-tool';
import {Store} from 'redux';
import {ApplicationState, store as storeFactory} from './store';
import {SearchService, provider as searchProvider} from './search';

export interface ServiceRegistry {
    itinerary: ItineraryService;
    store: Store<ApplicationState>;
    navigation: NavigationService;
    mapTools: MapToolService;
    search: SearchService;
}

const provider = (): ServiceRegistry => {
    // @ts-ignore
    const registry: ServiceRegistry = {};
    const store = registry.store = storeFactory()();
    registry.itinerary = itineraryProvider(store);
    registry.navigation = navigationProvider(store);
    registry.mapTools = mapToolProvider(registry);
    registry.search = searchProvider(store);
    return registry;
};

export default provider();
