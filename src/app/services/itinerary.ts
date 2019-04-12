import {Store} from 'redux';
import {ApplicationState, EnhancedDispatch} from './store';
import {
    addItineraryPointWithSideEffects,
    removeItineraryPointWithSideEffects,
    resetRoutes,
    AddItineraryPointAction,
    RemoveItineraryPointAction,
    moveItineraryPointWithSideEffects,
    InsertionPosition,
    changeItineraryPointWithSideEffects,
    UpdateItineraryPointAction
} from '../actions/itinerary';
import {UIPoint, StatePoint, GeoLocation} from '../util';

// todo does not need to be async
export interface ItineraryService {
    startMove(p: UIPoint | StatePoint): void;

    moveBefore(p: UIPoint | StatePoint): Promise<any>;

    moveAfter(p: UIPoint | StatePoint): Promise<any>;

    addPoint(p: GeoLocation, before ?: UIPoint): Promise<any>;

    removePoint(p: UIPoint | StatePoint): Promise<any>;

    updatePoint(id: number, value: GeoLocation): Promise<any>;

    reset(): void;
}

export const provider = (store: Store<ApplicationState>): ItineraryService => {

    let movingPoint: UIPoint = null;

    return {
        startMove(p: UIPoint | StatePoint) {
            const {stops} = store.getState().itinerary;
            movingPoint = <UIPoint>stops
                .find(i => i.id === p.id) || null;
        },
        async moveBefore(p: UIPoint | StatePoint) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, p.id, InsertionPosition.BEFORE));
            }
            movingPoint = null;
        },
        async moveAfter(p: UIPoint | StatePoint) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, p.id, InsertionPosition.AFTER));
            }
            movingPoint = null;
        },
        async addPoint(point, before?: UIPoint) {
            return (<EnhancedDispatch<AddItineraryPointAction>>store.dispatch)(addItineraryPointWithSideEffects(point, before ? before.id : null));
        },
        async removePoint(point: UIPoint | StatePoint) {
            return (<EnhancedDispatch<RemoveItineraryPointAction>>store.dispatch)(removeItineraryPointWithSideEffects(point.id));
        },
        async updatePoint(id: number, location: GeoLocation) {
            return (<EnhancedDispatch<UpdateItineraryPointAction>>store.dispatch)(changeItineraryPointWithSideEffects(id, location));
        },
        reset() {
            store.dispatch(resetRoutes());
        }
    };
};
