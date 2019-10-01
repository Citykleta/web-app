import {Assert} from 'zora';
import {ActionType} from '../../../src/app/common/actions';
import {stubFactory} from '../utils';
import {fetchLeisureRoutesFromAPI} from '../../../src/app/leisure/actions';
import {provider} from '../../../src/app/leisure/service';

const storeFactory = stubFactory('dispatch');

export default (a: Assert) => {
    a.test(`searchRoute should dispatch the result of ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action`, async t => {
        const store = storeFactory();
        const fetchRouteFromAPIStub = stubFactory('fetchLeisureRoutesFromAPI')();
        const stub = {
            //@ts-ignore
            fetchLeisureRoutesFromAPI: fetchRouteFromAPIStub.fetchLeisureRoutesFromAPI
        };
        //@ts-ignore
        const service = provider(store, stub);
        await service.searchRoutes();
        t.ok(fetchRouteFromAPIStub.hasBeenCalled(), 'fetchLeisureRoutesFromAPI action creator should have been called');
        t.eq(fetchRouteFromAPIStub.getCall(), [], 'no argument should have been provided');
        t.ok(store.hasBeenCalled(), 'store.dispatch should have been called');
        t.eq(store.getCall(), [[]], `should not have provided any argument`);
    });

    a.test(`selectRoute should dispatch the result of ${ActionType.SELECT_LEISURE_ROUTE} action`, t => {
        const store = storeFactory();
        const selectLeisureRouteStub = stubFactory('selectLeisureRoute')();
        const stub = {
            //@ts-ignore
            selectLeisureRoute: selectLeisureRouteStub.selectLeisureRoute
        };
        //@ts-ignore
        const service = provider(store, stub);
        service.selectRoute(4);
        t.ok(selectLeisureRouteStub.hasBeenCalled(), 'selectLeisureRoute action creator should have been called');
        t.eq(selectLeisureRouteStub.getCall(), [4], 'should have been called with the route id');
        t.ok(store.hasBeenCalled(), 'store.dispatch should have been called');
        t.eq(store.getCall(), [[4]], `route id should have been forwarded`);
    });
}