import {Assert} from 'zora';
import {provider} from '../../../src/app/services/search';
import {createTestSearchResult, stubFactory} from '../utils';

const storeFactory = stubFactory('dispatch');

export default ({test}: Assert) => {
    test(`selectSearchResult should dispatch the result of "selectSearchResult" action`, t => {
        const store = storeFactory();
        const actionStub = stubFactory('selectSearchResult')();
        // @ts-ignore
        const service = provider(store, actionStub);

        const searchResult = createTestSearchResult(333, 444);
        service.selectSearchResult(searchResult);
        t.ok(actionStub.hasBeenCalled(), 'selectSearchResult action should have been called');
        t.eq(actionStub.getCall(), [searchResult], ' should have forwarded the search result argument');
        t.ok(store.hasBeenCalled(), 'action should have been dispatched');
        t.eq(store.getCall(), [[searchResult]], 'argument should have been forwarded by the action');
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
        const expectedArgs = [];
        await service.searchAddress('');

        t.notOk(fetchSearchResultFromAPIStub.hasBeenCalled(), 'api should not have been called');
        t.ok(fetchSearchResultWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should have been called once');
        t.eq(fetchSearchResultWithSuccessStub.getCall(), [expectedArgs], 'fetchSearchResultWithSuccess should have been called with the empty array');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [[expectedArgs]], 'store.dispatch should have been called with the result of fetchSearchResultWithSuccess action');
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

        const expected = 'foo';
        await service.searchAddress('foo');

        t.ok(fetchSearchResultFromAPIStub.hasBeenCalled(), 'api should have been called once');
        t.notOk(fetchSearchResultWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should not have been called');
        t.eq(fetchSearchResultFromAPIStub.getCall(), [expected], 'fetchSearchResultFromAPIS should have been called with the query string');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [[expected]], 'store.dispatch should have been called with the result of fetchSearchResultFromAPI action');
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
        const expected = [];

        await service.searchPointOfInterest('');

        t.notOk(fetchPointsOfInterestFromAPIStub.hasBeenCalled(), 'api should not have been called');
        t.ok(fetchPointsOfInterestWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should have been called once');
        t.eq(fetchPointsOfInterestWithSuccessStub.getCall(), [expected], 'fetchSearchResultWithSuccess should have been called with the empty array');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [[expected]], 'store.dispatch should have been called with the result of fetchPointsOfInterestWithSuccess action');
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

        const expected = 'foo';
        await service.searchPointOfInterest('foo');

        t.ok(fetchPointsOfInterestFromAPIStub.hasBeenCalled(), 'api should have been called');
        t.notOk(fetchPointsOfInterestWithSuccessStub.hasBeenCalled(), 'fetchSearchResultWithSuccess should not have been called');
        t.eq(fetchPointsOfInterestFromAPIStub.getCall(), [expected], 'fetchPointsOfInterestFromAPI should have been called with the query string');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [[expected]], 'store.dispatch should have been called with the result of fetchPointsOfInterestFromAPI action');
    });

    test(`searchPointOfInterestNearBy with valid location should forward the search to the api`, async t => {
        const store = storeFactory();
        const fetchClosestFromAPIStub = stubFactory('fetchClosestFromAPI')();
        const stub = {
            //@ts-ignore
            fetchClosestFromAPI: fetchClosestFromAPIStub.fetchClosestFromAPI
        };
        //@ts-ignore
        const service = provider(store, stub);
        const location = {lng: 1234, lat: 4321};

        await service.searchPointOfInterestNearBy(location);

        t.ok(fetchClosestFromAPIStub.hasBeenCalled(), 'api should have been called');
        t.eq(fetchClosestFromAPIStub.getCall(), [location], 'fetchClosestFromAPI should have been called with the provided location');
        t.ok(store.hasBeenCalled(), 'store.disptach should have been called once');
        t.eq(store.getCall(), [[location]], 'store.dispatch should have been called with the result of fetchClosestFromAPI action');
    });
}
