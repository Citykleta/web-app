import {ApplicationState} from '../store/store';
import {Store} from 'redux';
import {Theme} from './reducer';
import {changeTheme} from './actions';

export interface SettingsService {
    changeTheme(theme: Theme): void;

    getTheme(): Theme;
}

export const provider = (store: Store<ApplicationState>): SettingsService => {
    return {
        changeTheme(theme): void {
            store.dispatch(changeTheme(theme));
        },
        getTheme() {
            return store.getState().settings.theme;
        }
    };
};
