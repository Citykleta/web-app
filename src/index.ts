import {connect} from './app/common/connect';
import {App} from './app/app';
import store from './app/store/index';
import {ApplicationState} from './app/store/store';
import './app/navigation';
import {ButtonIcon} from './app/common/elements/button-icon';
import {ListBox, ListBoxOption} from '@citykleta/ui-kit';

const ConnectedApp = connect(store, (state: ApplicationState) => {
    return {
        selectedView: state.navigation.selectedView,
        theme: state.settings.theme // module my not be loaded
    };
})(App);

customElements.define('citykleta-listbox', ListBox);
customElements.define('citykleta-listbox-option', ListBoxOption);
customElements.define('citykleta-button-icon', ButtonIcon);
customElements.define('citykleta-app', ConnectedApp);

