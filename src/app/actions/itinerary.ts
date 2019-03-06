import {GeoCoord} from '../tools/interfaces';
import {ActionType} from './types';
import {Action} from 'redux';
import {WayPoint} from '../reducers/itinerary';

export interface AddItineraryPointAction extends Action<ActionType.ADD_ITINERARY_POINT> {
    point: WayPoint,
    beforeId?: number
}

export const addItineraryPoint = (point: WayPoint, beforeId: number = null): AddItineraryPointAction => ({
    type: ActionType.ADD_ITINERARY_POINT,
    point,
    beforeId
});

export interface RemoveItineraryPointAction extends Action<ActionType.REMOVE_ITINERARY_POINT> {
    id: number
}

export const removeItineraryPoint = (id: number): RemoveItineraryPointAction => ({
    type: ActionType.REMOVE_ITINERARY_POINT,
    id
});

export interface ChangeItineraryPointLocationAction extends Action<ActionType.CHANGE_ITINERARY_POINT_LOCATION> {
    id: number,
    location: GeoCoord
}

export const changeItineraryPointLocation = (id: number, location: GeoCoord): ChangeItineraryPointLocationAction => ({
    type: ActionType.CHANGE_ITINERARY_POINT_LOCATION,
    id,
    location
});
