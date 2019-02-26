import {factory as toolbarFactory} from './components/toolbar';
import {factory as toolDrawerFactory} from './components/tool-drawer';
import registry from './services/service-registry';
import {factory as mapFactory} from './components/map';

const drawer = toolDrawerFactory(registry);
const toolbar = toolbarFactory(registry);
const drawerDom = drawer.dom();
drawerDom.appendChild(toolbar.dom());

const body = document.querySelector('body');
body.appendChild(drawerDom);

const map = mapFactory(registry);
