import { reducer } from '../../../src/app/reducers/search';
import { addItineraryPoint } from '../../../src/app/actions/itinerary';
import { createTestSearchResult, defaultState as globalDefaultState } from '../utils';
import { fetchClosest, fetchClosestWithFailure, fetchClosestWithSuccess, fetchPointsOfInterest, fetchPointsOfInterestWithSuccess, fetchSearchResult, fetchSearchResultWithFailure, fetchSearchResultWithSuccess, selectSearchResult } from '../../../src/app/actions/search';
import { ActionType } from '../../../src/app/actions/types';
const defaultState = () => globalDefaultState().search;
export default (assert) => {
    const { test } = assert;
    const skip = assert.skip.bind(assert);
    test('should return state is if the action type is not related to search', t => {
        const initialState = defaultState();
        const actual = reducer(initialState, addItineraryPoint({
            type: 'lng_lat',
            lng: 5432,
            lat: 1234
        }));
        t.eq(actual, initialState, 'should return the same state');
    });
    test(`responding to ${ActionType.FETCH_POINTS_OF_INTEREST} action should turn the search state into search mode`, t => {
        const initialState = Object.assign(defaultState(), {
            searchResult: [createTestSearchResult(1234, 5432)]
        });
        const actual = reducer(initialState, fetchPointsOfInterest('foo'));
        t.eq(actual, { isSearching: true, searchResult: [], selectedSearchResult: null });
    });
    test(`responding to ${ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS} action, should change the pointsOfInterest part of the search state`, t => {
        const initialState = Object.assign(defaultState(), { isSearching: true });
        const pointsOfInterest = [{
                type: 'point_of_interest',
                name: 'foo',
                geometry: {
                    type: 'Point',
                    coordinates: [5432, 1234]
                },
                category: 'bar',
                address: {},
                municipality: 'playa'
            }, {
                type: 'point_of_interest',
                name: 'bodeguita',
                geometry: {
                    type: 'Point',
                    coordinates: [754, 344]
                },
                category: 'bar',
                address: {},
                municipality: 'habana vieja'
            }];
        const actual = reducer(initialState, fetchPointsOfInterestWithSuccess(pointsOfInterest));
        t.eq(actual, {
            searchResult: pointsOfInterest,
            selectedSearchResult: null,
            isSearching: false
        });
    });
    test(`responding to ${ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS} action, should not automatically select the item it there is only one result`, t => {
        const initialState = defaultState();
        const pointsOfInterest = [{
                type: 'point_of_interest',
                name: 'foo',
                geometry: {
                    type: 'Point',
                    coordinates: [5432, 1234]
                },
                category: 'bar',
                address: {},
                municipality: 'playa'
            }];
        const actual = reducer(initialState, fetchPointsOfInterestWithSuccess(pointsOfInterest));
        t.eq(actual, {
            searchResult: pointsOfInterest,
            selectedSearchResult: null,
            isSearching: false
        });
    });
    test('responding to SELECT_SEARCH_RESULT action, should change the selectedSearchResult part of the state', t => {
        const searchResult = [{ type: 'lng_lat', lng: 5432, lat: 1234 }];
        const initialState = Object.assign(defaultState(), {
            searchResult
        });
        t.eq(reducer(initialState, selectSearchResult(searchResult[0])), {
            searchResult,
            isSearching: false,
            selectedSearchResult: searchResult[0]
        });
    });
    test('responding to FETCH_SEARCH_RESULT action', t => {
        const searchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
        const initialState = Object.assign(defaultState(), {
            searchResult,
            selectedSearchResult: searchResult[0]
        });
        t.eq(reducer(initialState, fetchSearchResult('hello')), {
            searchResult: [],
            selectedSearchResult: null,
            isSearching: true
        });
    });
    test(`responding to ${ActionType.FETCH_SEARCH_RESULT_SUCCESS} action, should update the searchResult part`, t => {
        const initalSearchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        const newSearchResult = [
            createTestSearchResult(5678, 8765),
            createTestSearchResult(23425, 25242)
        ];
        t.eq(reducer(initialState, fetchSearchResultWithSuccess(newSearchResult)), {
            isSearching: false,
            searchResult: newSearchResult,
            selectedSearchResult: null
        });
    });
    test(`responding to ${ActionType.FETCH_SEARCH_RESULT_SUCCESS} action, should automatically select the result if there is only one suggestion`, t => {
        const initalSearchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        const newSearchResult = [createTestSearchResult(5678, 8765)];
        t.eq(reducer(initialState, fetchSearchResultWithSuccess(newSearchResult)), {
            isSearching: false,
            searchResult: newSearchResult,
            selectedSearchResult: newSearchResult[0]
        });
    });
    test('responding to FETCH_SEARCH_RESULT_FAILURE action, should update the searchResult part of the state', t => {
        const initalSearchResult = [{ type: 'lng_lat', lng: 1234, lat: 4321 }];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        t.eq(reducer(initialState, fetchSearchResultWithFailure({ message: 'something went wrong' })), {
            isSearching: false,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
    });
    test('responding to FETCH_SEARCH_RESULT action, should set the state in searching mode', t => {
        const searchResult = [createTestSearchResult(1234, 4321)];
        const location = createTestSearchResult(46456, 34534);
        const initialState = Object.assign(defaultState(), {
            searchResult,
            selectedSearchResult: searchResult[0]
        });
        t.eq(reducer(initialState, fetchClosest(location)), {
            searchResult: [],
            selectedSearchResult: null,
            isSearching: true
        });
    });
    test(`responding to ${ActionType.FETCH_CLOSEST_FAILURE} action, should update the searchResult part of the state`, t => {
        const initalSearchResult = [createTestSearchResult(1234, 4321)];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        t.eq(reducer(initialState, fetchClosestWithFailure({ message: 'something went wrong' })), {
            isSearching: false,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
    });
    test(`responding to ${ActionType.FETCH_CLOSEST_SUCCESS} action, should update the searchResult part`, t => {
        const initalSearchResult = [createTestSearchResult(1234, 4321)];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        const newSearchResult = [
            createTestSearchResult(5678, 8765),
            createTestSearchResult(7456, 2345)
        ];
        t.eq(reducer(initialState, fetchClosestWithSuccess(newSearchResult)), {
            isSearching: false,
            searchResult: newSearchResult,
            selectedSearchResult: null
        });
    });
    test(`responding to ${ActionType.FETCH_CLOSEST_SUCCESS} action, should automatically select the item if there is only one result`, t => {
        const initalSearchResult = [createTestSearchResult(1234, 4321)];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        const newSearchResult = [
            createTestSearchResult(5678, 8765)
        ];
        t.eq(reducer(initialState, fetchClosestWithSuccess(newSearchResult)), {
            isSearching: false,
            searchResult: newSearchResult,
            selectedSearchResult: newSearchResult[0]
        });
    });
};
