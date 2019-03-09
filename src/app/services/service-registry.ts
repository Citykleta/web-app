import {ItineraryService, provider as itineraryProvider} from './itinerary';
import {NavigationService, provider as navigationProvider} from './navigation';
import {MapToolService, provider as mapToolProvider} from './map-tool';
import {Store} from 'redux';
import {ApplicationState, store as storeFactory} from './store';

export interface ServiceRegistry {
    itinerary: ItineraryService;
    store: Store<ApplicationState>;
    navigation: NavigationService;
    mapTools: MapToolService;
}

const provider = (): ServiceRegistry => {
    // @ts-ignore
    const registry: ServiceRegistry = {};

    const store = registry.store = storeFactory()();

    const itinerary = registry.itinerary = itineraryProvider(store);
    const navigation = registry.navigation = navigationProvider(store);
    const mapTools = registry.mapTools = mapToolProvider(registry);
    return registry;
};

export default provider();
