import { reducer, Theme } from '../../../src/app/reducers/settings';
import { addItineraryPoint } from '../../../src/app/actions/itinerary';
import { changeTheme } from '../../../src/app/actions/settings';
export default ({ test }) => {
    test('should return state is if the action type is different than CHANGE_THEME', t => {
        const actual = reducer({ theme: Theme.LIGHT }, addItineraryPoint({
            lng: 2323,
            lat: 23432
        }));
        t.eq(actual, { theme: Theme.LIGHT }, 'should return the same state');
    });
    test('should return state with the new selected theme', t => {
        const actual = reducer({ theme: Theme.LIGHT }, changeTheme(Theme.DARK));
        t.eq(actual, { theme: Theme.DARK }, 'should hve changed the theme');
    });
};
