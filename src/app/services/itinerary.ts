import {Events, ItineraryState, Store} from './store';
import {Point} from '../tools/interfaces';

export interface ItineraryService {
    addPoint(p: Point, index ?: number): void;

    removePoint(p: Point): void;

    reset(): void;
}

export const provider = (store: Store): ItineraryService => {

    let itineraryStops = [];

    store.on(Events.ITINERARY_STOPS_CHANGED, (state: ItineraryState) => {
        itineraryStops = state.stops;
    });

    return {
        addPoint(point, index) {
            store.addItineraryPoint(point, index);
        },
        removePoint(point: Point) {
            store.removeItineraryPoint(itineraryStops.indexOf(point));
        },
        reset() {
            let toRemove = itineraryStops.length;
            while (toRemove > 0) {
                store.removeItineraryPoint(0);
                toRemove--;
            }
        }
    };
};
