import {Assert} from 'zora';
import {ActionType} from '../../../src/app/common/actions';
import {updateMapPosition} from '../../../src/app/map/actions';

export default (a: Assert) => {
    a.test(`updateMapPosition() - should generate an ${ActionType.UPDATE_MAP} action with the center only`, t => {
        t.eq(updateMapPosition({
            center: [123, 456]
        }), {
            type: ActionType.UPDATE_MAP,
            center: [123, 456]
        });
    });

    a.test(`updateMapPosition() - should generate an ${ActionType.UPDATE_MAP} action with the zoom only`, t => {
        t.eq(updateMapPosition({
            zoom: 12
        }), {
            type: ActionType.UPDATE_MAP,
            zoom: 12
        });
    });

    a.test(`updateMapPosition() - should generate an ${ActionType.UPDATE_MAP} action with both the zoom and the center`, t => {
        t.eq(updateMapPosition({
            zoom: 12,
            center: [123, 456]
        }), {
            type: ActionType.UPDATE_MAP,
            zoom: 12,
            center: [123, 456]
        });
    });



};
