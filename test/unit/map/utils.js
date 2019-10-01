import { pointListToFeature } from '../../../src/app/map/utils';
const fakeSource = () => {
    return {
        calls: [],
        setData(...args) {
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
export default (a) => {
    const { test } = a;
    test('pointListToFeature should transform a point collection into a valid GeoJSON feature collection', t => {
        const points = [{ lng: 12345, lat: 54321 }, { lng: 7890, lat: 9876 }];
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
};
