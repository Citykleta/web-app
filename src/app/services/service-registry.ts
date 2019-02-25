import {ItineraryService, provider as itineraryProvider} from './itinerary';
import {Store, provider as storeProvider} from './store';
import {NavigationService, provider as navigationProvider} from './navigation';
import {MapToolService, provider as mapToolProvider} from './map-tool';

export interface ServiceRegistry {
    itinerary: ItineraryService;
    store: Store;
    navigation: NavigationService;
    mapTools: MapToolService;
}

const provider = (): ServiceRegistry => {
    // @ts-ignore
    const registry: ServiceRegistry = {};

    const store = registry.store = storeProvider();
    const itinerary = registry.itinerary = itineraryProvider(store);
    const navigation = registry.navigation = navigationProvider(store);
    const mapTools = registry.mapTools = mapToolProvider(registry);

    return registry;
};

export default provider();
