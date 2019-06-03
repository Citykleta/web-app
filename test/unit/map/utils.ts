import {Assert} from 'zora';
import {eventuallyUpdate, pointListToFeature} from '../../../src/app/map/utils';
import {GeoCoord} from '../../../src/app/utils';

const fakeSource = () => {
    return {
        calls: [],
        setData(args) {
            this.calls.push([...args]);
        }
    };
};

const fakeMap = () => {
    return {
        calls: [],
        getSource(sourceId) {
            this.calls.push(sourceId);
            return fakeSource();
        }
    };
};

export default (a: Assert) => {
    const {test} = a;
    test('pointListToFeature should transform a point collection into a valid GeoJSON feature collection', t => {
        const points: GeoCoord[] = [{lng: 12345, lat: 54321}, {lng: 7890, lat: 9876}];
        t.eq(pointListToFeature(points), {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [12345, 54321]
                }
            }, {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [7890, 9876]
                }
            }]
        });
    });

    a.skip('eventuallyUpdate: should update a layer when states are different', t => {

        let updateCalls = [];

        const slicer = state => state.search.suggestions;
        const map = fakeMap();
        const updateFunc = (state) => {
            updateCalls.push(state);
            return Object.assign({updated: true}, state);
        };

        const updater = eventuallyUpdate(map);

        const update = updater('suggestions', slicer, updateFunc);

        const state = {search: {suggestions: [{id: 1}]}};
        // @ts-ignore
        t.eq(update(state), true, 'should have marked as updated');
    });
};
