import { searchViewTool } from '../../../src/app/map/tools/search-tool';
import { isSameLocation } from '../../../src/app/map/canvas-interactions';
import { createTestSearchResult } from '../utils';
const fakeRegistry = () => {
    const stub = [];
    let selectCalls = [];
    let searchPOICalls = [];
    // @ts-ignore
    const fakeSearchService = {
        respondWith(arg, value) {
            stub.push({ arg, value });
            return this;
        },
        searchCalls() {
            return searchPOICalls;
        },
        selectCalls() {
            return selectCalls;
        },
        async searchPointOfInterest(arg) {
            searchPOICalls.push(arg);
            return [];
        },
        async searchPointOfInterestNearBy(arg) {
            // @ts-ignore
            const resp = stub.find(({ arg: key }) => isSameLocation(key, arg));
            if (!resp) {
                throw new Error('unexpected argument');
            }
            return resp.value;
        },
        selectSearchResult(r) {
            selectCalls.push(r);
        }
    };
    // @ts-ignore
    return {
        get(name) {
            if (name !== 'search') {
                throw new Error('should request search service only');
            }
            return fakeSearchService;
        }
    };
};
export default ({ test }) => {
    test('click action should fetch the suggestions near by the event location', async (t) => {
        const registry = fakeRegistry();
        const fakeService = registry.get('search');
        const location = { lng: 333, lat: 444 };
        fakeService.respondWith(location, {
            result: [
                createTestSearchResult(location.lng, location.lat),
                createTestSearchResult(1234, 4321)
            ]
        });
        const searchTool = searchViewTool(registry);
        await searchTool.clickAction({
            // @ts-ignore
            lngLat: {
                lng: 333,
                lat: 444
            }
        });
        t.eq(fakeService.selectCalls(), [createTestSearchResult(location.lng, location.lat)], 'should have selected the first result');
    });
    test('long click action: should init suggestions and select an arbitrary location', async (t) => {
        const registry = fakeRegistry();
        const fakeService = registry.get('search');
        const searchTool = searchViewTool(registry);
        // @ts-ignore
        await searchTool.longClickAction({ lngLat: { lng: 333, lat: 444 } });
        t.eq(fakeService.searchCalls(), [''], 'should have called the search with empty string argument');
        t.eq(fakeService.selectCalls(), [{
                type: 'lng_lat',
                lng: 333,
                lat: 444
            }], 'should have called the select with the event location');
    });
};
