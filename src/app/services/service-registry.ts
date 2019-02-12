import itinerary, {ItineraryService} from './itinerary';
import store, {Store} from './store';
import navigation, {NavigationService} from './navigation';

export interface ServiceRegistry {
    itinerary: ItineraryService;
    store: Store;
    navigation: NavigationService;
}

const provider = (): ServiceRegistry => ({
    itinerary,
    store,
    navigation
});

export default provider();
