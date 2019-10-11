import {App} from './app/app';
import store from './app/store/index';
import {ApplicationState} from './app/store/store';
import {ButtonIcon} from './app/common/elements/button-icon';
import {ListBox, ListBoxOption} from '@citykleta/ui-kit';
import {connect, defaultInjector, defaultRegistry, define} from './app/common';
/** navigation module is loaded by default */
import loadNavigationModule from './app/navigation';

loadNavigationModule(defaultRegistry, defaultInjector, store);

/** create app component*/
const ConnectedApp = connect(store, (state: ApplicationState) => {
    return {
        selectedView: state.navigation.selectedView,
        theme: state.settings.theme // module my not be loaded
    };
})(defaultInjector(App));

define('citykleta-app', ConnectedApp);

/**
 * some shared components which will be loaded whatever module is loaded
 */
define('citykleta-listbox', ListBox);
define('citykleta-listbox-option', ListBoxOption);
define('citykleta-button-icon', ButtonIcon);
