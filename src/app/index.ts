import {factory as toolbarFactory} from './components/toolbar';
import {factory as toolDrawerFactory} from './components/tool-drawer';
import registry from './services/service-registry';
import {factory as mapFactory} from './components/map';

const drawer = toolDrawerFactory(registry);
const toolbar = toolbarFactory(registry);
drawer.appendChild(toolbar);

const body = document.querySelector('body');
body.appendChild(drawer);

const map = mapFactory(registry);
