import {Assert} from 'zora';
import {provider} from '../../../src/app/services/search';
import {GeoCoordSearchResult} from '../../../src/app/utils';

const stubFactory = name => () => {

    const calls = [];

    return {
        [name]: (arg) => {
            calls.push(arg);
            return arg;
        },
        hasBeenCalled(count = 1) {
            return calls.length === count;
        },
        getCall(index = 0) {
            return calls[index];
        }
    };
};

// @ts-ignore
const storeFactory = stubFactory('dispatch');


export default ({test}: Assert) => {
    test(`selectSearchResult should dispatch the result of "selectSearchResult" action`, t => {
        const store = storeFactory();
        const actionStub = stubFactory('selectSearchResult')();
        // @ts-ignore
        const service = provider(store, actionStub);

        const searchResult = <GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: 333,
            lat: 222
        };
        service.selectSearchResult(searchResult);
        t.ok(actionStub.hasBeenCalled(), 'selectSearchResult action should have been called');
        t.eq(actionStub.getCall(), searchResult, ' should have forwarded the search result argument');
        t.ok(store.hasBeenCalled(), 'action should have been dispatched');
        t.eq(store.getCall(), searchResult, 'argument should have been forwarded by the action');
    });

    test(`searchAddress with empty query should forward an empty search result and avoid api call`, async t => {
        const store = storeFactory();
        const fetchSearchResultWithSuccessStub = stubFactory('fetchSearchResultWithSuccess')();
        const fetchSearchResultFromAPIStub = stubFactory('fetchSearchResultFromAPI')();
        const stub = {
            //@ts-ignore
            fetchSearchResultWithSuccess: fetchSearchResultWithSuccessStub.fetchSearchResultWithSuccess,
            //@ts-ignore
            fetchSearchResultFromAPI: fetchSearchResultFromAPIStub.fetchSearchResultFromAPI
        };
        //@ts-ignore
        const service = provider(store, stub);

        await service.searchAddress('');

        t.notOk(fetchSearchResultFromAPIStub.hasBeenCalled(), 'api should not have been called');
        t.ok(fetchSearchResultWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should have been called once');
        t.eq(fetchSearchResultWithSuccessStub.getCall(), [], 'fetchSearchResultWithSuccess should have been called with the empty array');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [], 'store.dispatch should have been called with the result of fetchSearchResultWithSuccess action');
    });

    test(`searchAddress with valid query should forward the search to the api`, async t => {
        const store = storeFactory();
        const fetchSearchResultWithSuccessStub = stubFactory('fetchSearchResultWithSuccess')();
        const fetchSearchResultFromAPIStub = stubFactory('fetchSearchResultFromAPI')();
        const stub = {
            //@ts-ignore
            fetchSearchResultWithSuccess: fetchSearchResultWithSuccessStub.fetchSearchResultWithSuccess,
            //@ts-ignore
            fetchSearchResultFromAPI: fetchSearchResultFromAPIStub.fetchSearchResultFromAPI
        };
        //@ts-ignore
        const service = provider(store, stub);

        await service.searchAddress('foo');

        t.ok(fetchSearchResultFromAPIStub.hasBeenCalled(), 'api should have been called once');
        t.notOk(fetchSearchResultWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should not have been called');
        t.eq(fetchSearchResultFromAPIStub.getCall(), 'foo', 'fetchSearchResultFromAPIS should have been called with the query string');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), 'foo', 'store.dispatch should have been called with the result of fetchSearchResultFromAPI action');
    });

    test(`searchPointOfInterest with empty query should forward an empty search result and avoid api call`, async t => {
        const store = storeFactory();
        const fetchPointsOfInterestWithSuccessStub = stubFactory('fetchPointsOfInterestWithSuccess')();
        const fetchPointsOfInterestFromAPIStub = stubFactory('fetchPointsOfInterestFromAPI')();
        const stub = {
            //@ts-ignore
            fetchPointsOfInterestWithSuccess: fetchPointsOfInterestWithSuccessStub.fetchPointsOfInterestWithSuccess,
            //@ts-ignore
            fetchPointsOfInterestFromAPI: fetchPointsOfInterestFromAPIStub.fetchPointsOfInterestFromAPI
        };
        //@ts-ignore
        const service = provider(store, stub);

        await service.searchPointOfInterest('');

        t.notOk(fetchPointsOfInterestFromAPIStub.hasBeenCalled(), 'api should not have been called');
        t.ok(fetchPointsOfInterestWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should have been called once');
        t.eq(fetchPointsOfInterestWithSuccessStub.getCall(), [], 'fetchSearchResultWithSuccess should have been called with the empty array');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [], 'store.dispatch should have been called with the result of fetchPointsOfInterestWithSuccess action');
    });

    test(`searchPointOfInterest with valid query should forward the search to the api`, async t => {
        const store = storeFactory();
        const fetchPointsOfInterestWithSuccessStub = stubFactory('fetchPointsOfInterestWithSuccess')();
        const fetchPointsOfInterestFromAPIStub = stubFactory('fetchPointsOfInterestFromAPI')();
        const stub = {
            //@ts-ignore
            fetchPointsOfInterestWithSuccess: fetchPointsOfInterestWithSuccessStub.fetchPointsOfInterestWithSuccess,
            //@ts-ignore
            fetchPointsOfInterestFromAPI: fetchPointsOfInterestFromAPIStub.fetchPointsOfInterestFromAPI
        };
        //@ts-ignore
        const service = provider(store, stub);

        await service.searchPointOfInterest('foo');

        t.ok(fetchPointsOfInterestFromAPIStub.hasBeenCalled(), 'api should have been called');
        t.notOk(fetchPointsOfInterestWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should not have been called');
        t.eq(fetchPointsOfInterestFromAPIStub.getCall(), 'foo', 'fetchPointsOfInterestFromAPI should have been called with the query string');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), 'foo', 'store.dispatch should have been called with the result of fetchPointsOfInterestFromAPI action');
    });

}
