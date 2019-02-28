import {Events, ItineraryState, Store, WayPoint} from './store';
import {GeoCoord} from '../tools/interfaces';

export interface ItineraryService {
    startMove(p: WayPoint): void;

    moveBefore(p: WayPoint): void;

    moveAfter(p: WayPoint): void;

    addPoint(p: GeoCoord, before ?: WayPoint): void;

    removePoint(p: WayPoint): void;

    reset(): void;
}

export const provider = (store: Store): ItineraryService => {

    let itineraryStops: WayPoint[] = [];
    let movingPoint: WayPoint = null;

    store.on(Events.ITINERARY_STOPS_CHANGED, (state: ItineraryState) => {
        itineraryStops = state.stops;
    });

    return {
        startMove(p: WayPoint) {
            movingPoint = itineraryStops.includes(p) ? p : null;
        },
        moveBefore(p: WayPoint) {
            if (movingPoint) {
                this.addPoint({lat: movingPoint.lat, lng: movingPoint.lng}, p);
                this.removePoint(movingPoint);
            }
            movingPoint = null;
        },
        moveAfter(p: WayPoint) {
            if (movingPoint) {
                const index = itineraryStops.findIndex(i => i.id === p.id);
                this.addPoint({lat: movingPoint.lat, lng: movingPoint.lng}, itineraryStops[index + 1]);
                this.removePoint(movingPoint);
            }
            movingPoint = null;
        },
        addPoint(point, before?: WayPoint) {
            store.addItineraryPoint(point, before ? before.id : void 0);
        },
        removePoint(point: WayPoint) {
            store.removeItineraryPoint(point.id);
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
