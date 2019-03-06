import { reducer } from '../../../src/app/reducers/itinerary';
import { selectTool } from '../../../src/app/actions/tool-box';
import { ToolType } from '../../../src/app/tools/interfaces';
import { addItineraryPoint, changeItineraryPointLocation, removeItineraryPoint } from '../../../src/app/actions/itinerary';
export default ({ test }) => {
    test('should return the previous state if action is not related to itinerary', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 43
                }],
            routes: []
        };
        const actual = reducer(initialState, selectTool(ToolType.ITINERARY));
        t.eq(actual, initialState, 'state should not have changed');
    });
    test('add a point without specifying the insertion position', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, addItineraryPoint({
            lng: 789,
            lat: 987,
            id: 4
        }));
        t.eq(actual, {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }, {
                    lng: 789,
                    lat: 987,
                    id: 4
                }],
            routes: []
        });
    });
    test('add a point specifying a valid insertion position', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, addItineraryPoint({
            lng: 789,
            lat: 987,
            id: 4
        }, 2));
        t.eq(actual, {
            stops: [{
                    lng: 789,
                    lat: 987,
                    id: 4
                }, {
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        });
    });
    test('change an existing point coordinates', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, changeItineraryPointLocation(2, {
            lng: 789,
            lat: 987
        }));
        t.eq(actual, {
            stops: [{
                    id: 2,
                    lng: 789,
                    lat: 987
                }],
            routes: []
        });
    });
    test('change a non existing point coordinates: should not modify state', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, changeItineraryPointLocation(666, {
            lng: 789,
            lat: 987
        }));
        t.eq(actual, initialState);
    });
    test('remove an existing point', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, removeItineraryPoint(2));
        t.eq(actual, { stops: [], routes: [] });
    });
    test('remove a non existing point', t => {
        const initialState = {
            stops: [{
                    lng: 1234,
                    lat: 4321,
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, removeItineraryPoint(666));
        t.eq(actual, initialState);
    });
};
