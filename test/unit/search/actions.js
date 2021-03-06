import { ActionType } from '../../../src/app/common/actions';
import { fetchClosest, fetchClosestFromAPI, fetchClosestWithFailure, fetchClosestWithSuccess, fetchPointsOfInterest, fetchPointsOfInterestFromAPI, fetchPointsOfInterestWithFailure, fetchPointsOfInterestWithSuccess, fetchSearchResult, fetchSearchResultFromAPI, fetchSearchResultWithFailure, fetchSearchResultWithSuccess, selectSearchResult } from '../../../src/app/search/actions';
import { createTestSearchResult } from '../utils';
export default (a) => {
    const { test } = a;
    const skip = a.skip.bind(a);
    test('create a FETCH_POINTS_OF_INTEREST action', t => {
        t.eq(fetchPointsOfInterest('don cangrejo'), {
            type: ActionType.FETCH_POINTS_OF_INTEREST,
            query: 'don cangrejo'
        });
    });
    test('create a FETCH_POINTS_OF_INTEREST_SUCCESS action', t => {
        const pointOfInterest = {
            type: 'point_of_interest',
            name: 'foo',
            geometry: {
                type: 'Point',
                coordinates: [1234, 4321]
            },
            address: {},
            category: 'bar',
        };
        t.eq(fetchPointsOfInterestWithSuccess([pointOfInterest]), {
            type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
            result: [pointOfInterest]
        });
    });
    test('create a FETCH_POINTS_OF_INTEREST_FAILURE action', t => {
        t.eq(fetchPointsOfInterestWithFailure('some error'), {
            type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
            error: 'some error'
        });
    });
    test('fetch pointsOfInterest from API when API returns pointsOfInterest', async (t) => {
        const actions = [];
        const thunk = fetchPointsOfInterestFromAPI('revolucion');
        const suggestionsStub = [{
                type: 'point_of_interest',
                name: 'foo',
                geometry: {
                    type: 'Point',
                    coordinates: [1234, 4321]
                },
                address: {},
                category: 'bar',
            }];
        const fakeDispatch = a => actions.push(a);
        const fakeGeocoder = {
            async searchPointsOfInterest(query) {
                return suggestionsStub;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeocoder
        });
        t.eq(actions, [{
                type: ActionType.FETCH_POINTS_OF_INTEREST,
                query: 'revolucion'
            }, {
                type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
                result: suggestionsStub
            }]);
    });
    test('fetch pointsOfInterest from API when API fails', async (t) => {
        const actions = [];
        const thunk = fetchPointsOfInterestFromAPI('revolucion');
        const fakeDispatch = a => actions.push(a);
        const error = new Error('oh no!');
        const fakeGeocoder = {
            async searchPointsOfInterest(query) {
                throw error;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeocoder
        });
        t.eq(actions, [{
                type: ActionType.FETCH_POINTS_OF_INTEREST,
                query: 'revolucion'
            }, {
                type: ActionType.FETCH_POINTS_OF_INTEREST_FAILURE,
                error
            }]);
    });
    test('fetch search result: should create a FETCH_SEARCH_RESULT action', t => {
        t.eq(fetchSearchResult('some query'), {
            type: ActionType.FETCH_SEARCH_RESULT,
            query: 'some query'
        });
    });
    test('fetch search result with success: should return a FETCH_SEARCH_RESULT_WITH_SUCCESS action', t => {
        t.eq(fetchSearchResultWithSuccess([
            { type: 'lng_lat', lng: 1234, lat: 5432 }
        ]), {
            type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
            result: [
                { type: 'lng_lat', lng: 1234, lat: 5432 }
            ]
        });
    });
    test('fetch search result with failure: should return a FETCH_SEARCH_RESULT_WITH_FAILURE action', t => {
        t.eq(fetchSearchResultWithFailure({ message: 'oops' }), {
            type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
            error: { message: 'oops' }
        });
    });
    test('fetch search result from api when api succeed', async (t) => {
        const actions = [];
        const thunk = fetchSearchResultFromAPI('hello');
        const fakeDispatch = a => actions.push(a);
        const stubResult = [{
                type: 'corner',
                streets: ['1ra', '10'],
                geometry: {
                    type: 'Point',
                    coordinates: [123, 543]
                }
            }];
        const fakeGeocoder = {
            async searchAddress(query) {
                return stubResult;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeocoder
        });
        t.eq(actions, [{
                type: ActionType.FETCH_SEARCH_RESULT,
                query: 'hello'
            }, {
                type: ActionType.FETCH_SEARCH_RESULT_SUCCESS,
                result: stubResult
            }]);
    });
    test('fetch search result from api when api fails', async (t) => {
        const actions = [];
        const thunk = fetchSearchResultFromAPI('hello');
        const fakeDispatch = a => actions.push(a);
        const error = new Error('oops something is wrong');
        const fakeGeocoder = {
            async searchAddress(query) {
                throw error;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeocoder
        });
        t.eq(actions, [{
                type: ActionType.FETCH_SEARCH_RESULT,
                query: 'hello'
            }, {
                type: ActionType.FETCH_SEARCH_RESULT_FAILURE,
                error
            }]);
    });
    test('create a SELECT_SEARCH_RESULT action', t => {
        const searchResult = { type: 'lng_lat', lng: 1234, lat: 5432 };
        t.eq(selectSearchResult(searchResult), {
            type: ActionType.SELECT_SEARCH_RESULT,
            searchResult
        });
    });
    test('create a FETCH_CLOSEST action', t => {
        const location = {
            lng: 222,
            lat: 333
        };
        t.eq(fetchClosest(location), {
            type: ActionType.FETCH_CLOSEST,
            location
        });
    });
    test('fetch closest location with success', t => {
        const searchResults = [createTestSearchResult(1234, 4321), createTestSearchResult(23234, 53232)];
        t.eq(fetchClosestWithSuccess(searchResults), {
            type: ActionType.FETCH_CLOSEST_SUCCESS,
            result: searchResults
        });
    });
    test('fetch closest location with failure', t => {
        const error = new Error('something went wrong');
        t.eq(fetchClosestWithFailure(error), {
            type: ActionType.FETCH_CLOSEST_FAILURE,
            error
        });
    });
    test('fetch closest from api when api succeed', async (t) => {
        const actions = [];
        const location = { lng: 1234, lat: 4321 };
        const thunk = fetchClosestFromAPI(location);
        const fakeDispatch = a => actions.push(a);
        const stubResult = [createTestSearchResult(234, 432), createTestSearchResult(765, 456)];
        const fakeGeoCoder = {
            async reverse(locationQuery) {
                if (locationQuery !== location) {
                    throw new Error('unexpected argument');
                }
                return stubResult;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeoCoder
        });
        t.eq(actions, [{
                type: ActionType.FETCH_CLOSEST,
                location
            }, {
                type: ActionType.FETCH_CLOSEST_SUCCESS,
                result: stubResult
            }]);
    });
    test('fetch closest from api when api succeed', async (t) => {
        const actions = [];
        const location = { lng: 1234, lat: 4321 };
        const error = new Error('something went wrong');
        const thunk = fetchClosestFromAPI(location);
        const fakeDispatch = a => actions.push(a);
        const fakeGeoCoder = {
            async reverse(locationQuery) {
                if (locationQuery !== location) {
                    throw new Error('unexpected argument');
                }
                throw error;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeoCoder
        });
        t.eq(actions, [{
                type: ActionType.FETCH_CLOSEST,
                location
            }, {
                type: ActionType.FETCH_CLOSEST_FAILURE,
                error
            }]);
    });
};
