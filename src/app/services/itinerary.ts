import {GeoCoord} from '../tools/interfaces';
import {Action, Store} from 'redux';
import {API, ApplicationState} from './store';
import {WayPoint} from '../reducers/itinerary';
import {
    addItineraryPointWithSideEffects,
    removeItineraryPointWithSideEffects,
    resetRoutes,
    AddItineraryPointAction,
    RemoveItineraryPointAction, addItineraryPoint, moveItineraryPointWithSideEffects, InsertionPosition
} from '../actions/itinerary';
import {ThunkAction, ThunkDispatch} from 'redux-thunk';

export interface ItineraryService {
    startMove(p: WayPoint): void;

    moveBefore(p: WayPoint): Promise<any>;

    moveAfter(p: WayPoint): Promise<any>;

    addPoint(p: GeoCoord, before ?: WayPoint): Promise<any>;

    removePoint(p: WayPoint): Promise<any>;

    reset(): void;
}

interface EnhancedDispatch<K extends Action<any>> extends ThunkDispatch<ApplicationState, API, K> {
}

export const provider = (store: Store<ApplicationState>): ItineraryService => {

    let movingPoint: WayPoint = null;

    return {
        startMove(p: WayPoint) {
            movingPoint = store.getState().itinerary.stops.find(i => i.id === p.id) || null;
        },
        async moveBefore(p: WayPoint) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, p.id, InsertionPosition.BEFORE));
            }
            movingPoint = null;
        },
        async moveAfter(p: WayPoint) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, p.id, InsertionPosition.AFTER));
            }
            movingPoint = null;
        },
        async addPoint(point, before?: WayPoint) {
            return (<EnhancedDispatch<AddItineraryPointAction>>store.dispatch)(addItineraryPointWithSideEffects(point, before ? before.id : null));
        },
        async removePoint(point: WayPoint) {
            return (<EnhancedDispatch<RemoveItineraryPointAction>>store.dispatch)(removeItineraryPointWithSideEffects(point.id));
        },
        reset() {
            store.dispatch(resetRoutes());
        }
    };
};
