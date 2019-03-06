import { ActionType } from '../../../src/app/actions/types';
import { addItineraryPoint, changeItineraryPointLocation, removeItineraryPoint } from '../../../src/app/actions/itinerary';
export default ({ test }) => {
    test('create an ADD_ITINERARY_ACTION without specifying the "before" item', t => {
        const expected = {
            type: ActionType.ADD_ITINERARY_POINT,
            point: {
                id: 42, lng: -82.396679, lat: 23.115898
            },
            beforeId: null
        };
        t.eq(addItineraryPoint({
            id: 42,
            lng: -82.396679,
            lat: 23.115898
        }), expected);
    });
    test('create an create an ADD_ITINERARY_ACTION specifying the "before" item', t => {
        const expected = {
            type: ActionType.ADD_ITINERARY_POINT,
            point: {
                id: 42, lng: -82.396679, lat: 23.115898
            },
            beforeId: 666
        };
        t.eq(addItineraryPoint({
            id: 42,
            lng: -82.396679,
            lat: 23.115898,
        }, 666), expected);
    });
    test('create a REMOVE_ITINERARY_POINT action', t => {
        const expected = {
            type: ActionType.REMOVE_ITINERARY_POINT,
            id: 66
        };
        t.eq(removeItineraryPoint(66), expected);
    });
    test('create a CHANGE_ITINERARY_POINT_LOCATION action', t => {
        const expected = {
            type: ActionType.CHANGE_ITINERARY_POINT_LOCATION,
            id: 42,
            location: {
                lng: -82.396679,
                lat: 23.115898
            }
        };
        t.eq(changeItineraryPointLocation(42, {
            lng: -82.396679,
            lat: 23.115898
        }), expected);
    });
};
