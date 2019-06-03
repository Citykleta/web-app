import {Store} from 'redux';
import {ApplicationState, EnhancedDispatch} from './store';
import {
    AddItineraryPointAction,
    addItineraryPointWithSideEffects,
    changeItineraryPointWithSideEffects,
    InsertionPosition,
    moveItineraryPointWithSideEffects,
    RemoveItineraryPointAction,
    removeItineraryPointWithSideEffects,
    resetRoutes,
    UpdateItineraryPointAction
} from '../actions/itinerary';
import {ItineraryPoint, SearchResult} from '../utils';

export interface ItineraryService {
    startMove(id: number): void;

    moveBefore(id: number): Promise<any>;

    moveAfter(id: number): Promise<any>;

    addPoint(p: SearchResult, beforeId ?: number): Promise<any>;

    removePoint(id: number): Promise<any>;

    updatePoint(id: number, value: SearchResult): Promise<any>;

    reset(): void;
}

export const provider = (store: Store<ApplicationState>): ItineraryService => {

    let movingPoint: ItineraryPoint = null;

    return {
        startMove(id) {
            const {stops} = store.getState().itinerary;
            movingPoint = stops
                .find(i => i.id === id) || null;
        },
        async moveBefore(id) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, id, InsertionPosition.BEFORE));
            }
            movingPoint = null;
        },
        async moveAfter(id) {
            if (movingPoint) {
                // @ts-ignore
                store.dispatch(moveItineraryPointWithSideEffects(movingPoint.id, id, InsertionPosition.AFTER));
            }
            movingPoint = null;
        },
        async addPoint(point, beforeId?) {
            return (<EnhancedDispatch<AddItineraryPointAction>>store.dispatch)(addItineraryPointWithSideEffects(point, beforeId !== undefined ? beforeId : null));
        },
        async removePoint(id) {
            return (<EnhancedDispatch<RemoveItineraryPointAction>>store.dispatch)(removeItineraryPointWithSideEffects(id));
        },
        async updatePoint(id: number, location: SearchResult) {
            return (<EnhancedDispatch<UpdateItineraryPointAction>>store.dispatch)(changeItineraryPointWithSideEffects(id, location));
        },
        reset() {
            store.dispatch(resetRoutes());
        }
    };
};
