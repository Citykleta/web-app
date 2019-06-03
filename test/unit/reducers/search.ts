import {Assert} from 'zora';
import {reducer, SearchState} from '../../../src/app/reducers/search';
import {addItineraryPoint} from '../../../src/app/actions/itinerary';
import {defaultState as globalDefaultState} from '../utils';
import {GeoCoordSearchResult} from '../../../src/app/utils';

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

    skip('responding to FETCH_POINTS_OF_INTEREST action, should change the pointsOfInterest part of the search state', t => {
        // const initialState = defaultState();
        // const actual = reducer(initialState, fetchPointsOfInterestWithSuccess([
        //     {lng: 5432, lat: 1234}, {lng: 754, lat: 344}
        // ]));
        // t.eq(actual, {
        //     searchResult: [{
        //         sourceId: 0,
        //         lng: 5432,
        //         lat: 1234
        //     }, {
        //         sourceId: 1,
        //         lng: 754,
        //         lat: 344
        //     }],
        //     selectedSuggestion: null
        // });
    });

    skip('responding to SELECT_SUGGESTION action, should change the selectedSuggestion part of the state', t => {
        // const suggestions = [{sourceId: 0, lng: 5432, lat: 1234}];
        // const initialState = Object.assign(defaultState(), {
        //     suggestions
        // });
        //
        // t.eq(reducer(initialState, selectSuggestion(suggestions[0])), {
        //     suggestions,
        //     selectedSuggestion: suggestions[0]
        // });
    });
}
