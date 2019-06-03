import { ActionType } from '../../../src/app/actions/types';
import { fetchPointsOfInterest, fetchPointsOfInterestFromAPI, fetchPointsOfInterestWithFailure } from '../../../src/app/actions/search';
export default ({ test, skip }) => {
    test('create a FETCH_POINTS_OF_INTEREST action', t => {
        t.eq(fetchPointsOfInterest('don cangrejo'), {
            type: ActionType.FETCH_POINTS_OF_INTEREST,
            query: 'don cangrejo'
        });
    });
    skip('create a FETCH_POINTS_OF_INTEREST_SUCCESS action', t => {
        // t.eq(fetchPointsOfInterestWithSuccess([{
        //     geometry: {
        //         type: 'Point',
        //         coordinates: [1234, 4321]
        //     }
        // }]), {
        //     type: ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS,
        //     pointsOfInterest: [{
        //         lng: 1234,
        //         lat: 4321
        //     }]
        // });
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
        const suggestionsStub = [
            { lng: 1234, lat: 5432 }
        ];
        const fakeDispatch = a => actions.push(a);
        const fakeGeocoder = {
            async search(query) {
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
                suggestions: suggestionsStub
            }]);
    });
    test('fetch pointsOfInterest from API when API fails', async (t) => {
        const actions = [];
        const thunk = fetchPointsOfInterestFromAPI('revolucion');
        const fakeDispatch = a => actions.push(a);
        const error = new Error('oh no!');
        const fakeGeocoder = {
            async search(query) {
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
};
