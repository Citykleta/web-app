import { store } from '../../../src/app/store/store';
import { defaultState, stubFactory } from '../utils';
import { View } from '../../../src/app/navigation/reducer';
import { provider } from '../../../src/app/navigation/service';
import { ActionType } from '../../../src/app/common/actions';
export default (a) => {
    a.test('getView() - should return the currently set view', t => {
        const storeInstance = store()(Object.assign(defaultState(), { navigation: { selectedView: View.ITINERARY } }));
        const service = provider(storeInstance);
        t.eq(service.getView(), View.ITINERARY);
    });
    a.test('selectView() - should change the current selected view', t => {
        const storeInstance = stubFactory('dispatch')();
        // @ts-ignore
        const service = provider(storeInstance);
        service.selectView(View.ITINERARY);
        t.ok(storeInstance.hasBeenCalled(), 'dispatch should have been called');
        t.eq(storeInstance.getCall(), [{
                type: ActionType.SELECT_VIEW,
                view: View.ITINERARY
            }]);
    });
};
