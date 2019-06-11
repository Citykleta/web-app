import {Assert} from 'zora';
import {reducer, SearchState} from '../../../src/app/reducers/search';
import {addItineraryPoint} from '../../../src/app/actions/itinerary';
import {defaultState as globalDefaultState} from '../utils';
import {GeoCoordSearchResult, PointOfInterestSearchResult} from '../../../src/app/utils';
import {
    fetchPointsOfInterestWithSuccess,
    fetchSearchResult,
    fetchSearchResultWithFailure,
    fetchSearchResultWithSuccess,
    selectSearchResult
} from '../../../src/app/actions/search';

const defaultState = (): SearchState => globalDefaultState().search;

export default ({test, skip}: Assert) => {
    test('should return state is if the action type is not related to search', t => {
        const initialState = defaultState();
        const actual = reducer(initialState, addItineraryPoint(<GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: 5432,
            lat: 1234
        }));
        t.eq(actual, initialState, 'should return the same state');
    });

    test('responding to FETCH_POINTS_OF_INTEREST action, should change the pointsOfInterest part of the search state', t => {
        const initialState = defaultState();
        const pointsOfInterest: PointOfInterestSearchResult[] = [{
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

    test('responding to SELECT_SEARCH_RESULT action, should change the selectedSearchResult part of the state', t => {
        const searchResult = [<GeoCoordSearchResult>{type: 'lng_lat', lng: 5432, lat: 1234}];
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
        const searchResult = [{type: 'lng_lat', lng: 1234, lat: 4321}];
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

    test('responding to FETCH_SEARCH_RESULT_SUCCESS action, should update the searchResult part', t => {
        const initalSearchResult = [{type: 'lng_lat', lng: 1234, lat: 4321}];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });

        const newSearchResult = [<GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: 5678,
            lat: 8765
        }];
        t.eq(reducer(initialState, fetchSearchResultWithSuccess(newSearchResult)), {
            isSearching: false,
            searchResult: newSearchResult,
            selectedSearchResult: null
        });
    });

    test('responding to FETCH_SEARCH_RESULT_FAILURE action, should update the searchResult part of the state', t => {
        const initalSearchResult = [<GeoCoordSearchResult>{type: 'lng_lat', lng: 1234, lat: 4321}];
        const initialState = Object.assign(defaultState(), {
            isSearching: true,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
        t.eq(reducer(initialState, fetchSearchResultWithFailure({message: 'something went wrong'})), {
            isSearching: false,
            searchResult: initalSearchResult,
            selectedSearchResult: initalSearchResult[0]
        });
    });
}
