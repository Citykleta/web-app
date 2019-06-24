import { createTestSearchResult, stubFactory } from '../utils';
import { provider } from '../../../src/app/services/itinerary';
const storeFactory = stubFactory('dispatch');
export default ({ test }) => {
    test('addPoint - should dispatch addItineraryPointWithSideEffects with no insert position specified', async (t) => {
        const addItineraryPointWithSideEffectsStub = stubFactory('addItineraryPointWithSideEffects')();
        const stub = {
            //@ts-ignore
            addItineraryPointWithSideEffects: addItineraryPointWithSideEffectsStub.addItineraryPointWithSideEffects
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        const searchResult = createTestSearchResult(3333, 4444);
        await service.addPoint(searchResult);
        t.ok(addItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(addItineraryPointWithSideEffectsStub.getCall(), [searchResult, null]);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[searchResult, null]]);
    });
    test('addPoint - should dispatch addItineraryPointWithSideEffects specifying the insert position', async (t) => {
        const addItineraryPointWithSideEffectsStub = stubFactory('addItineraryPointWithSideEffects')();
        const stub = {
            //@ts-ignore
            addItineraryPointWithSideEffects: addItineraryPointWithSideEffectsStub.addItineraryPointWithSideEffects
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        const searchResult = createTestSearchResult(3333, 4444);
        await service.addPoint(searchResult, 3);
        t.ok(addItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(addItineraryPointWithSideEffectsStub.getCall(), [searchResult, 3]);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[searchResult, 3]]);
    });
    test('removePoint - should make the store dispatch a removeItineraryPointWithSideEffects action', async (t) => {
        const removeItineraryPointWithSideEffectsStub = stubFactory('removeItineraryPointWithSideEffects')();
        const stub = {
            //@ts-ignore
            removeItineraryPointWithSideEffects: removeItineraryPointWithSideEffectsStub.removeItineraryPointWithSideEffects
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        await service.removePoint(4);
        t.ok(removeItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(removeItineraryPointWithSideEffectsStub.getCall(), [4]);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[4]]);
    });
    test('updatePoint - should dispatch changeItineraryPointWithSideEffects', async (t) => {
        const changeItineraryPointWithSideEffectsStub = stubFactory('changeItineraryPointWithSideEffects')();
        const stub = {
            //@ts-ignore
            changeItineraryPointWithSideEffects: changeItineraryPointWithSideEffectsStub.changeItineraryPointWithSideEffects
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        const searchResult = createTestSearchResult(3333, 4444);
        await service.updatePoint(3, searchResult);
        t.ok(changeItineraryPointWithSideEffectsStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(changeItineraryPointWithSideEffectsStub.getCall(), [3, searchResult]);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[3, searchResult]]);
    });
    test('reset - should dispatch a resetRoutes action creator', t => {
        const resetRoutesStub = stubFactory('resetRoutes')();
        const stub = {
            //@ts-ignore
            resetRoutes: resetRoutesStub.resetRoutes
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        service.reset();
        t.ok(resetRoutesStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(resetRoutesStub.getCall(), []);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[]]);
    });
    test('goTo - should dispatch a goTo action creator', t => {
        const goToStub = stubFactory('goTo')();
        const stub = {
            //@ts-ignore
            goTo: goToStub.goTo
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        const searchResult = createTestSearchResult(3333, 4444);
        service.goTo(searchResult);
        t.ok(goToStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(goToStub.getCall(), [searchResult]);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[searchResult]]);
    });
    test('goFrom - should dispatch a goFrom action creator', t => {
        const goFromStub = stubFactory('goFrom')();
        const stub = {
            //@ts-ignore
            goFrom: goFromStub.goFrom
        };
        const store = storeFactory();
        //@ts-ignore
        const service = provider(store, stub);
        const searchResult = createTestSearchResult(3333, 4444);
        service.goFrom(searchResult);
        t.ok(goFromStub.hasBeenCalled(), 'action creator should have been called once');
        t.eq(goFromStub.getCall(), [searchResult]);
        t.ok(store.hasBeenCalled(), 'dispatch should have been called');
        t.eq(store.getCall(), [[searchResult]]);
    });
};
