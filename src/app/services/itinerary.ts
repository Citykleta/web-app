import {Action, Store} from 'redux';
import {API, ApplicationState, EnhancedDispatch} from './store';
import {
    addItineraryPointWithSideEffects,
    removeItineraryPointWithSideEffects,
    resetRoutes,
    AddItineraryPointAction,
    RemoveItineraryPointAction,
    moveItineraryPointWithSideEffects,
    InsertionPosition
} from '../actions/itinerary';
import { ThunkDispatch} from 'redux-thunk';
import {GeoLocation, GeoCoord, UIPoint} from '../util';

export interface ItineraryService {
    startMove(p: UIPoint): void;

    moveBefore(p: UIPoint): Promise<any>;

    moveAfter(p: UIPoint): Promise<any>;

    addPoint(p: GeoCoord, before ?: UIPoint): Promise<any>;

    removePoint(p: UIPoint): Promise<any>;

    reset(): void;
}

export const provider = (store: Store<ApplicationState>): ItineraryService => {

    let movingPoint: UIPoint = null;

    return {
        startMove(p: UIPoint) {
            movingPoint = store.getState().itinerary.stops.find(i => i.id === p.id) || null;
        },
        async moveBefore(p: UIPoint) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, p.id, InsertionPosition.BEFORE));
            }
            movingPoint = null;
        },
        async moveAfter(p: UIPoint) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, p.id, InsertionPosition.AFTER));
            }
            movingPoint = null;
        },
        async addPoint(point, before?: UIPoint) {
            return (<EnhancedDispatch<AddItineraryPointAction>>store.dispatch)(addItineraryPointWithSideEffects(point, before ? before.id : null));
        },
        async removePoint(point: UIPoint) {
            return (<EnhancedDispatch<RemoveItineraryPointAction>>store.dispatch)(removeItineraryPointWithSideEffects(point.id));
        },
        reset() {
            store.dispatch(resetRoutes());
        }
    };
};
