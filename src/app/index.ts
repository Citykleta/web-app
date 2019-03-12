import {factory as toolbarFactory} from './components/toolbar';
import {factory as toolDrawerFactory} from './components/tool-drawer';
import registry from './services/service-registry';
import {factory as mapFactory} from './components/map';
import {Theme} from './reducers/settings';

const drawer = toolDrawerFactory(registry);
const toolbar = toolbarFactory(registry);
const drawerDom = drawer.dom();
drawerDom.appendChild(toolbar.dom());

const body = document.querySelector('body');
// todo create a component from it
const {store} = registry;

store.subscribe(() => {
    const {settings:{theme}} = store.getState();
    const themeDark = 'theme-dark';

    if(theme === Theme.DARK && !body.classList.contains(themeDark)){
        body.classList.add(themeDark)
    }

    if(theme === Theme.LIGHT && body.classList.contains(themeDark)){
        body.classList.remove(themeDark);
    }
});

body.appendChild(drawerDom);

const map = mapFactory(registry);
