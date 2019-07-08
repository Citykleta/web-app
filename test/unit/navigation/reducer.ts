import {Assert} from 'zora';
import {reducer, View} from '../../../src/app/navigation/reducer';
import {fetchPointsOfInterest} from '../../../src/app/search/actions';
import {ActionType} from '../../../src/app/common/actions';
import {selectView} from '../../../src/app/navigation/actions';

export default (a: Assert) => {
    a.test('should forward previous state if action is not related', t => {
        t.eq(reducer({
            selectedView: View.SETTINGS
        }, fetchPointsOfInterest('woot')), {
            selectedView: View.SETTINGS
        });
    });

    a.test(`react on ${ActionType.SELECT_VIEW}: should set the new selected view`, t => {
        t.eq(reducer({
            selectedView: View.SETTINGS
        }, selectView(View.ITINERARY)), {
            selectedView: View.ITINERARY
        });
    });
};
